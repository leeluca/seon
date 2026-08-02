import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { getDb } from '../../../src/db/db.js';
import * as schema from '../../../src/db/schema.js';
import {
  applySyncTransaction,
  RetryableSyncConflictError,
} from '../../../src/services/sync.service.js';
import type { UploadSyncTransaction } from '../../../src/types/sync.js';

const userId = '019b2f0e-7c32-7000-8000-000000000001';
const otherUserId = '019b2f0e-7c32-7000-8000-000000000002';
const goalId = '019b2f0e-7c32-7000-8000-000000000003';
const entryId = '019b2f0e-7c32-7000-8000-000000000004';
const clientId = '019b2f0e-7c32-7000-8000-000000000005';
const timestamp = '2026-07-20T00:00:00.000Z';

const client = new PGlite();
const pgliteDb = drizzle(client, { schema });
const db = pgliteDb as unknown as ReturnType<typeof getDb>;

function goalPut(transactionId: string): UploadSyncTransaction {
  return {
    clientId,
    transactionId,
    operations: [
      {
        table: 'goal',
        op: 'PUT',
        id: goalId,
        data: {
          shortId: 'goal-1',
          title: 'Initial title',
          description: null,
          initialValue: 0,
          currentValue: 0,
          target: 10,
          unit: 'times',
          startDate: timestamp,
          targetDate: timestamp,
          createdAt: timestamp,
          updatedAt: '2000-01-01T00:00:00.000Z',
          completionDate: null,
          archivedAt: null,
          type: 'COUNT',
        },
      },
      {
        table: 'entry',
        op: 'PUT',
        id: entryId,
        data: {
          shortId: 'entry-1',
          goalId,
          value: 1,
          date: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    ],
  };
}

beforeAll(async () => {
  await client.exec(`
    CREATE TYPE "GoalType" AS ENUM ('COUNT', 'PROGRESS', 'BOOLEAN');
    CREATE TABLE "user" (
      "id" uuid PRIMARY KEY,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "emailVerified" boolean NOT NULL DEFAULT false,
      "image" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE "profile" (
      "userId" uuid PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
      "shortId" text UNIQUE,
      "name" text NOT NULL,
      "email" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "useSync" boolean NOT NULL DEFAULT false,
      "preferences" jsonb
    );
    CREATE TABLE "goal" (
      "id" uuid PRIMARY KEY,
      "shortId" text UNIQUE,
      "title" text NOT NULL,
      "description" text,
      "initialValue" integer NOT NULL DEFAULT 0,
      "currentValue" integer NOT NULL DEFAULT 0,
      "target" integer NOT NULL,
      "unit" text NOT NULL DEFAULT '',
      "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "startDate" timestamptz NOT NULL DEFAULT now(),
      "targetDate" timestamptz NOT NULL DEFAULT now(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL,
      "completionDate" timestamptz,
      "archivedAt" timestamptz,
      "type" "GoalType" NOT NULL DEFAULT 'COUNT'
    );
    CREATE TABLE "entry" (
      "id" uuid PRIMARY KEY,
      "shortId" text UNIQUE,
      "goalId" uuid NOT NULL REFERENCES "goal"("id") ON DELETE CASCADE,
      "value" integer NOT NULL,
      "date" timestamptz NOT NULL DEFAULT now(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    );
    CREATE TABLE "sync_transaction" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "clientId" uuid NOT NULL,
      "transactionId" text NOT NULL,
      "status" text NOT NULL,
      "rejections" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("userId", "clientId", "transactionId")
    );
  `);
});

beforeEach(async () => {
  await client.exec(
    'TRUNCATE TABLE "sync_transaction", "entry", "goal", "profile", "user" CASCADE;',
  );
  await pgliteDb.insert(schema.user).values([
    {
      id: userId,
      name: 'Current User',
      email: 'current@example.com',
      emailVerified: true,
    },
    {
      id: otherUserId,
      name: 'Other User',
      email: 'other@example.com',
      emailVerified: true,
    },
  ]);
});

afterAll(async () => client.close());

describe('applySyncTransaction', () => {
  it('atomically applies related rows and deduplicates a retry', async () => {
    const transaction = goalPut('transaction-1');
    const first = await applySyncTransaction({
      db,
      user: {
        id: userId,
        name: 'Current User',
        email: 'current@example.com',
      },
      transaction,
    });
    const duplicate = await applySyncTransaction({
      db,
      user: {
        id: userId,
        name: 'Current User',
        email: 'current@example.com',
      },
      transaction,
    });

    expect(first).toMatchObject({ status: 'applied', rejected: [] });
    expect(duplicate).toMatchObject({ status: 'duplicate', rejected: [] });
    expect(
      await pgliteDb
        .select()
        .from(schema.goal)
        .where(eq(schema.goal.userId, userId)),
    ).toHaveLength(1);
    expect(
      await pgliteDb
        .select()
        .from(schema.entry)
        .where(eq(schema.entry.userId, userId)),
    ).toHaveLength(1);
    expect(await pgliteDb.select().from(schema.syncTransaction)).toHaveLength(
      1,
    );
  });

  it('uses server arrival order and never accepts client ownership fields', async () => {
    await applySyncTransaction({
      db,
      user: {
        id: userId,
        name: 'Current User',
        email: 'current@example.com',
      },
      transaction: goalPut('transaction-1'),
    });

    for (const [transactionId, title] of [
      ['transaction-2', 'Second title'],
      ['transaction-3', 'Last title'],
    ]) {
      const result = await applySyncTransaction({
        db,
        user: {
          id: userId,
          name: 'Current User',
          email: 'current@example.com',
        },
        transaction: {
          clientId,
          transactionId,
          operations: [
            { table: 'goal', op: 'PATCH', id: goalId, data: { title } },
          ],
        },
      });
      expect(result.status).toBe('applied');
    }

    const rejected = await applySyncTransaction({
      db,
      user: {
        id: userId,
        name: 'Current User',
        email: 'current@example.com',
      },
      transaction: {
        clientId,
        transactionId: 'transaction-4',
        operations: [
          {
            table: 'goal',
            op: 'PATCH',
            id: goalId,
            data: { userId: otherUserId },
          },
        ],
      },
    });

    expect(rejected).toMatchObject({
      status: 'rejected',
      rejected: [{ code: 'unsupported_field' }],
    });
    const [saved] = await pgliteDb
      .select({
        title: schema.goal.title,
        userId: schema.goal.userId,
        targetDate: schema.goal.targetDate,
      })
      .from(schema.goal)
      .where(eq(schema.goal.id, goalId));
    expect(saved).toMatchObject({ title: 'Last title', userId });
    expect(new Date(saved?.targetDate ?? '').toISOString()).toBe(timestamp);
  });

  it('rejects the entire transaction when one related operation is invalid', async () => {
    const transaction = goalPut('transaction-atomic-rejection');
    const entryOperation = transaction.operations[1];
    if (!entryOperation?.data) throw new Error('Entry fixture is missing');
    entryOperation.data.goalId = '019b2f0e-7c32-7000-8000-000000000099';

    const result = await applySyncTransaction({
      db,
      user: {
        id: userId,
        name: 'Current User',
        email: 'current@example.com',
      },
      transaction,
    });

    expect(result).toMatchObject({
      status: 'rejected',
      rejected: [{ operationIndex: 1, code: 'goal_not_found' }],
    });
    expect(await pgliteDb.select().from(schema.goal)).toHaveLength(0);
    expect(await pgliteDb.select().from(schema.entry)).toHaveLength(0);
  });

  it('hides records owned by another account', async () => {
    const otherGoal = goalPut('other').operations[0];
    if (!otherGoal?.data) throw new Error('Goal fixture is missing');
    await pgliteDb.insert(schema.goal).values({
      ...(otherGoal.data as Omit<typeof schema.goal.$inferInsert, 'id'>),
      id: goalId,
      userId: otherUserId,
      updatedAt: timestamp,
    });

    const result = await applySyncTransaction({
      db,
      user: {
        id: userId,
        name: 'Current User',
        email: 'current@example.com',
      },
      transaction: {
        clientId,
        transactionId: 'transaction-owner-check',
        operations: [
          {
            table: 'goal',
            op: 'PATCH',
            id: goalId,
            data: { title: 'Stolen' },
          },
        ],
      },
    });

    expect(result).toMatchObject({
      status: 'rejected',
      rejected: [{ code: 'goal_not_found' }],
    });
    const [saved] = await pgliteDb
      .select()
      .from(schema.goal)
      .where(
        and(eq(schema.goal.id, goalId), eq(schema.goal.userId, otherUserId)),
      );
    expect(saved?.title).toBe('Initial title');
  });

  it('rolls back a goal PATCH when the target disappears after preflight', async () => {
    await applySyncTransaction({
      db,
      user: {
        id: userId,
        name: 'Current User',
        email: 'current@example.com',
      },
      transaction: goalPut('transaction-before-goal-race'),
    });
    await client.exec(`
      CREATE FUNCTION skip_goal_update() RETURNS trigger AS $$
      BEGIN
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER skip_goal_update
      BEFORE UPDATE ON "goal"
      FOR EACH ROW EXECUTE FUNCTION skip_goal_update();
    `);

    try {
      await expect(
        applySyncTransaction({
          db,
          user: {
            id: userId,
            name: 'Current User',
            email: 'current@example.com',
          },
          transaction: {
            clientId,
            transactionId: 'transaction-goal-race',
            operations: [
              {
                table: 'goal',
                op: 'PATCH',
                id: goalId,
                data: { title: 'Must remain queued' },
              },
            ],
          },
        }),
      ).rejects.toBeInstanceOf(RetryableSyncConflictError);
    } finally {
      await client.exec(`
        DROP TRIGGER skip_goal_update ON "goal";
        DROP FUNCTION skip_goal_update();
      `);
    }

    const [saved] = await pgliteDb
      .select({ title: schema.goal.title })
      .from(schema.goal)
      .where(eq(schema.goal.id, goalId));
    expect(saved?.title).toBe('Initial title');
    expect(await pgliteDb.select().from(schema.syncTransaction)).toHaveLength(
      1,
    );
  });

  it('rolls back an entry PATCH when the target disappears after preflight', async () => {
    await applySyncTransaction({
      db,
      user: {
        id: userId,
        name: 'Current User',
        email: 'current@example.com',
      },
      transaction: goalPut('transaction-before-entry-race'),
    });
    await client.exec(`
      CREATE FUNCTION skip_entry_update() RETURNS trigger AS $$
      BEGIN
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER skip_entry_update
      BEFORE UPDATE ON "entry"
      FOR EACH ROW EXECUTE FUNCTION skip_entry_update();
    `);

    try {
      await expect(
        applySyncTransaction({
          db,
          user: {
            id: userId,
            name: 'Current User',
            email: 'current@example.com',
          },
          transaction: {
            clientId,
            transactionId: 'transaction-entry-race',
            operations: [
              {
                table: 'entry',
                op: 'PATCH',
                id: entryId,
                data: { value: 2 },
              },
            ],
          },
        }),
      ).rejects.toBeInstanceOf(RetryableSyncConflictError);
    } finally {
      await client.exec(`
        DROP TRIGGER skip_entry_update ON "entry";
        DROP FUNCTION skip_entry_update();
      `);
    }

    const [saved] = await pgliteDb
      .select({ value: schema.entry.value })
      .from(schema.entry)
      .where(eq(schema.entry.id, entryId));
    expect(saved?.value).toBe(1);
    expect(await pgliteDb.select().from(schema.syncTransaction)).toHaveLength(
      1,
    );
  });
});
