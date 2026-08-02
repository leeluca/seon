import { and, eq, inArray } from 'drizzle-orm';

import type { getDb } from '../db/db.js';
import {
  entry,
  goal,
  profile,
  syncTransaction as syncTransactionTable,
} from '../db/schema.js';
import type {
  SyncOperation,
  SyncRejection,
  UploadSyncTransaction,
  UploadSyncTransactionResult,
} from '../types/sync.js';
import {
  type NormalizedSyncOperation,
  validateSyncOperation,
} from './sync-validation.js';

type Database = ReturnType<typeof getDb>;
type DatabaseTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];
type ProfilePreferences = (typeof profile.$inferInsert)['preferences'];

export class RetryableSyncConflictError extends Error {
  constructor(entity: 'goal' | 'entry', id: string) {
    super(`The ${entity} ${id} changed during sync`);
    this.name = 'RetryableSyncConflictError';
  }
}

export interface SyncUser {
  id: string;
  name: string;
  email: string;
}

export interface ApplySyncTransactionOptions {
  db: Database;
  user: SyncUser;
  transaction: UploadSyncTransaction;
}

interface ValidationResult {
  operations: NormalizedSyncOperation[];
  rejections: SyncRejection[];
}

function normalizeOperations(operations: SyncOperation[]): ValidationResult {
  const normalized: NormalizedSyncOperation[] = [];
  const rejections: SyncRejection[] = [];

  operations.forEach((operation, operationIndex) => {
    const result = validateSyncOperation(operation);
    if (result.rejection) {
      rejections.push({ operationIndex, ...result.rejection });
    } else {
      normalized.push(result.operation);
    }
  });

  return { operations: normalized, rejections };
}

async function claimTransaction(
  tx: DatabaseTransaction,
  userId: string,
  transaction: UploadSyncTransaction,
) {
  const [receipt] = await tx
    .insert(syncTransactionTable)
    .values({
      userId,
      clientId: transaction.clientId,
      transactionId: transaction.transactionId,
      status: 'pending',
      rejections: [],
    })
    .onConflictDoNothing()
    .returning({ id: syncTransactionTable.id });

  if (receipt) return { receipt, duplicate: null };

  const [duplicate] = await tx
    .select({
      status: syncTransactionTable.status,
      rejections: syncTransactionTable.rejections,
    })
    .from(syncTransactionTable)
    .where(
      and(
        eq(syncTransactionTable.userId, userId),
        eq(syncTransactionTable.clientId, transaction.clientId),
        eq(syncTransactionTable.transactionId, transaction.transactionId),
      ),
    )
    .limit(1);

  if (!duplicate) {
    throw new Error('Could not claim or find the sync transaction receipt');
  }
  return { receipt: null, duplicate };
}

async function markReceipt(
  tx: DatabaseTransaction,
  receiptId: string,
  status: 'applied' | 'rejected',
  rejections: SyncRejection[],
): Promise<void> {
  await tx
    .update(syncTransactionTable)
    .set({ status, rejections, updatedAt: new Date() })
    .where(eq(syncTransactionTable.id, receiptId));
}

async function preflightOperations(
  tx: DatabaseTransaction,
  operations: NormalizedSyncOperation[],
  userId: string,
): Promise<SyncRejection[]> {
  const entryIds = operations
    .filter((operation) => operation.table === 'entry')
    .map((operation) => operation.id);
  const existingEntries =
    entryIds.length === 0
      ? []
      : await tx
          .select({ id: entry.id, userId: entry.userId, goalId: entry.goalId })
          .from(entry)
          .where(inArray(entry.id, entryIds));
  const entryState = new Map<string, { userId: string; goalId: string } | null>(
    existingEntries.map((row) => [row.id, row]),
  );

  const goalIds = new Set(
    operations
      .filter((operation) => operation.table === 'goal')
      .map((operation) => operation.id),
  );
  for (const operation of operations) {
    if (operation.table === 'entry' && operation.data.goalId) {
      goalIds.add(operation.data.goalId);
    }
  }
  for (const row of existingEntries) goalIds.add(row.goalId);

  const existingGoals =
    goalIds.size === 0
      ? []
      : await tx
          .select({ id: goal.id, userId: goal.userId })
          .from(goal)
          .where(inArray(goal.id, [...goalIds]));
  const goalState = new Map<string, string | null>(
    existingGoals.map((row) => [row.id, row.userId]),
  );

  const rejections: SyncRejection[] = [];
  operations.forEach((operation, operationIndex) => {
    if (operation.table === 'profile') {
      if (operation.op !== 'DELETE' && operation.id !== userId) {
        rejections.push({
          operationIndex,
          code: 'profile_owner_mismatch',
          message: 'The profile id does not match the authenticated account',
        });
      }
      return;
    }

    if (operation.table === 'goal') {
      const owner = goalState.get(operation.id) ?? null;
      if (operation.op === 'PUT') {
        if (owner && owner !== userId) {
          rejections.push(notFound(operationIndex, 'goal'));
          return;
        }
        goalState.set(operation.id, userId);
        return;
      }
      if (owner !== userId) {
        rejections.push(notFound(operationIndex, 'goal'));
        return;
      }
      if (operation.op === 'DELETE') goalState.set(operation.id, null);
      return;
    }

    const current = entryState.get(operation.id) ?? null;
    if (operation.op !== 'PUT' && current?.userId !== userId) {
      rejections.push(notFound(operationIndex, 'entry'));
      return;
    }
    if (operation.op === 'PUT' && current && current.userId !== userId) {
      rejections.push(notFound(operationIndex, 'entry'));
      return;
    }
    if (operation.op === 'DELETE') {
      entryState.set(operation.id, null);
      return;
    }

    const goalId = operation.data.goalId ?? current?.goalId;
    if (!goalId || goalState.get(goalId) !== userId) {
      rejections.push({
        operationIndex,
        code: 'goal_not_found',
        message: 'The entry goal does not exist in this account',
      });
      return;
    }
    entryState.set(operation.id, { userId, goalId });
  });

  return rejections;
}

function notFound(
  operationIndex: number,
  entity: 'goal' | 'entry',
): SyncRejection {
  return {
    operationIndex,
    code: `${entity}_not_found`,
    message: `The ${entity} does not exist in this account`,
  };
}

async function applyGoalOperation(
  tx: DatabaseTransaction,
  operation: Extract<NormalizedSyncOperation, { table: 'goal' }>,
  userId: string,
  now: string,
): Promise<void> {
  if (operation.op === 'DELETE') {
    await tx
      .delete(goal)
      .where(and(eq(goal.id, operation.id), eq(goal.userId, userId)));
    return;
  }

  if (operation.op === 'PATCH') {
    const [updated] = await tx
      .update(goal)
      .set({ ...operation.data, updatedAt: now })
      .where(and(eq(goal.id, operation.id), eq(goal.userId, userId)))
      .returning({ id: goal.id });
    if (!updated) throw new RetryableSyncConflictError('goal', operation.id);
    return;
  }

  const values: typeof goal.$inferInsert = {
    id: operation.id,
    userId,
    shortId: operation.data.shortId ?? null,
    title: operation.data.title as string,
    description: operation.data.description ?? null,
    initialValue: operation.data.initialValue as number,
    currentValue: operation.data.currentValue as number,
    target: operation.data.target as number,
    unit: operation.data.unit as string,
    startDate: operation.data.startDate as string,
    targetDate: operation.data.targetDate as string,
    createdAt: operation.data.createdAt as string,
    updatedAt: now,
    completionDate: operation.data.completionDate ?? null,
    archivedAt: operation.data.archivedAt ?? null,
    type: operation.data.type,
  };
  const { id: _id, userId: _userId, ...updateValues } = values;
  const [updated] = await tx
    .update(goal)
    .set(updateValues)
    .where(and(eq(goal.id, operation.id), eq(goal.userId, userId)))
    .returning({ id: goal.id });
  if (updated) return;

  const [inserted] = await tx
    .insert(goal)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: goal.id });
  if (!inserted) throw new Error('Goal ownership changed during upload');
}

async function applyEntryOperation(
  tx: DatabaseTransaction,
  operation: Extract<NormalizedSyncOperation, { table: 'entry' }>,
  userId: string,
  now: string,
): Promise<void> {
  if (operation.op === 'DELETE') {
    await tx
      .delete(entry)
      .where(and(eq(entry.id, operation.id), eq(entry.userId, userId)));
    return;
  }

  if (operation.op === 'PATCH') {
    const [updated] = await tx
      .update(entry)
      .set({ ...operation.data, updatedAt: now })
      .where(and(eq(entry.id, operation.id), eq(entry.userId, userId)))
      .returning({ id: entry.id });
    if (!updated) throw new RetryableSyncConflictError('entry', operation.id);
    return;
  }

  const values: typeof entry.$inferInsert = {
    id: operation.id,
    userId,
    shortId: operation.data.shortId ?? null,
    goalId: operation.data.goalId as string,
    value: operation.data.value as number,
    date: operation.data.date as string,
    createdAt: operation.data.createdAt as string,
    updatedAt: now,
  };
  const { id: _id, userId: _userId, ...updateValues } = values;
  const [updated] = await tx
    .update(entry)
    .set(updateValues)
    .where(and(eq(entry.id, operation.id), eq(entry.userId, userId)))
    .returning({ id: entry.id });
  if (updated) return;

  const [inserted] = await tx
    .insert(entry)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: entry.id });
  if (!inserted) throw new Error('Entry ownership changed during upload');
}

async function applyProfileOperation(
  tx: DatabaseTransaction,
  operation: Extract<NormalizedSyncOperation, { table: 'profile' }>,
  user: SyncUser,
): Promise<void> {
  if (operation.op === 'DELETE') return;

  await tx
    .insert(profile)
    .values({
      userId: user.id,
      name: user.name,
      email: user.email,
      useSync: true,
      preferences: operation.data.preferences as ProfilePreferences,
    })
    .onConflictDoUpdate({
      target: profile.userId,
      set: {
        name: user.name,
        email: user.email,
        useSync: true,
        ...(Object.hasOwn(operation.data, 'preferences')
          ? {
              preferences: operation.data.preferences as ProfilePreferences,
            }
          : {}),
        updatedAt: new Date(),
      },
    });
}

async function applyOperations(
  tx: DatabaseTransaction,
  operations: NormalizedSyncOperation[],
  user: SyncUser,
): Promise<void> {
  const now = new Date().toISOString();
  for (const operation of operations) {
    switch (operation.table) {
      case 'goal':
        await applyGoalOperation(tx, operation, user.id, now);
        break;
      case 'entry':
        await applyEntryOperation(tx, operation, user.id, now);
        break;
      case 'profile':
        await applyProfileOperation(tx, operation, user);
        break;
    }
  }
}

export async function applySyncTransaction({
  db,
  user,
  transaction,
}: ApplySyncTransactionOptions): Promise<UploadSyncTransactionResult> {
  const validation = normalizeOperations(transaction.operations);

  return db.transaction(async (tx) => {
    const claim = await claimTransaction(tx, user.id, transaction);
    if (claim.duplicate) {
      return {
        result: true,
        transactionId: transaction.transactionId,
        status: 'duplicate',
        rejected: claim.duplicate.rejections,
      };
    }

    if (!claim.receipt) throw new Error('Sync transaction receipt is missing');

    const rejections = [...validation.rejections];
    if (rejections.length === 0) {
      rejections.push(
        ...(await preflightOperations(tx, validation.operations, user.id)),
      );
    }
    if (rejections.length > 0) {
      await markReceipt(tx, claim.receipt.id, 'rejected', rejections);
      return {
        result: true,
        transactionId: transaction.transactionId,
        status: 'rejected',
        rejected: rejections,
      };
    }

    await applyOperations(tx, validation.operations, user);
    await markReceipt(tx, claim.receipt.id, 'applied', []);
    return {
      result: true,
      transactionId: transaction.transactionId,
      status: 'applied',
      rejected: [],
    };
  });
}
