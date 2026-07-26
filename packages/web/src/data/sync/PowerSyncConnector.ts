import {
  UpdateType,
  type AbstractPowerSyncDatabase,
  type PowerSyncBackendConnector,
} from '@powersync/web';

import type { WorkspaceDescriptor } from '~/data/workspace';
import { APIError } from '~/utils/errors';
import {
  HttpSyncTransport,
  type SyncEntity,
  type SyncOperation,
  type SyncRejection,
  type SyncTransaction,
  type SyncTransport,
} from './SyncTransport';

const SYNC_ENTITIES = new Set<SyncEntity>(['goal', 'entry', 'profile']);

export interface PowerSyncConnectorOptions {
  workspace: WorkspaceDescriptor;
  transport?: SyncTransport;
  onAuthenticationRequired?: () => void;
}

export class PowerSyncConnector implements PowerSyncBackendConnector {
  private authenticationBlocked = false;
  private readonly transport: SyncTransport;

  constructor(private readonly options: PowerSyncConnectorOptions) {
    this.transport = options.transport ?? new HttpSyncTransport();
  }

  markAuthenticated(): void {
    this.authenticationBlocked = false;
  }

  async fetchCredentials() {
    if (this.authenticationBlocked) return null;

    try {
      const credentials = await this.transport.getCredentials();
      return {
        endpoint: credentials.endpoint,
        token: credentials.token,
        expiresAt: credentials.expiresAt
          ? new Date(credentials.expiresAt)
          : undefined,
      };
    } catch (error) {
      if (requiresAuthentication(error)) {
        this.blockForAuthentication();
        return null;
      }
      throw error;
    }
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    const transactionId = String(
      transaction.transactionId ?? transaction.crud[0]?.clientId,
    );
    const unknownOperations = transaction.crud
      .map((operation, operationIndex) => ({ operation, operationIndex }))
      .filter(({ operation }) => !isSyncEntity(operation.table));

    if (unknownOperations.length > 0) {
      const unknownIndices = new Set(
        unknownOperations.map(({ operationIndex }) => operationIndex),
      );
      for (const { operation, operationIndex } of unknownOperations) {
        await saveSyncError(database, {
          transactionId,
          operationIndex,
          entity: operation.table,
          entityId: operation.id,
          operation: operation.op,
          code: 'unsupported_entity',
          message: `The ${operation.table} table is not syncable`,
          payload: operation.opData,
        });
      }
      for (const [operationIndex, operation] of transaction.crud.entries()) {
        if (unknownIndices.has(operationIndex)) continue;
        await saveSyncError(database, {
          transactionId,
          operationIndex,
          entity: operation.table,
          entityId: operation.id,
          operation: operation.op,
          code: 'transaction_rejected',
          message:
            'Another operation caused the atomic transaction to be rejected',
          payload: operation.opData,
        });
      }
      await transaction.complete();
      return;
    }

    const upload: SyncTransaction = {
      clientId: this.options.workspace.clientId,
      transactionId,
      operations: transaction.crud.map((operation) => ({
        table: operation.table as SyncEntity,
        op: toSyncOperationType(operation.op),
        id: operation.id,
        ...(operation.opData ? { data: operation.opData } : {}),
      })),
    };

    try {
      const result = await this.transport.uploadTransaction(upload);
      await persistRejections(database, upload, result.rejected);
      await transaction.complete();
    } catch (error) {
      if (requiresAuthentication(error)) this.blockForAuthentication();
      // Authentication, connectivity, and server faults remain in the queue and
      // are retried. Only explicit semantic rejections are completed above.
      throw error;
    }
  }

  private blockForAuthentication(): void {
    if (this.authenticationBlocked) return;
    this.authenticationBlocked = true;
    this.options.onAuthenticationRequired?.();
  }
}

function isSyncEntity(table: string): table is SyncEntity {
  return SYNC_ENTITIES.has(table as SyncEntity);
}

function toSyncOperationType(operation: UpdateType): SyncOperation['op'] {
  switch (operation) {
    case UpdateType.PUT:
      return 'PUT';
    case UpdateType.PATCH:
      return 'PATCH';
    case UpdateType.DELETE:
      return 'DELETE';
  }
}

function requiresAuthentication(error: unknown): boolean {
  return (
    error instanceof APIError && (error.status === 401 || error.status === 403)
  );
}

interface SaveSyncErrorOptions {
  transactionId: string;
  operationIndex: number;
  entity: string;
  entityId: string;
  operation: string;
  code: string;
  message: string;
  payload?: unknown;
}

async function saveSyncError(
  database: AbstractPowerSyncDatabase,
  error: SaveSyncErrorOptions,
): Promise<void> {
  await database.execute(
    `INSERT INTO sync_error (
      id, transactionId, operationIndex, entity, entityId, operation,
      code, message, payload, createdAt, resolvedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      crypto.randomUUID(),
      error.transactionId,
      error.operationIndex,
      error.entity,
      error.entityId,
      error.operation,
      error.code,
      error.message,
      error.payload === undefined ? null : JSON.stringify(error.payload),
      new Date().toISOString(),
    ],
  );
}

async function persistRejections(
  database: AbstractPowerSyncDatabase,
  transaction: SyncTransaction,
  rejections: SyncRejection[],
): Promise<void> {
  const rejectedIndices = new Set<number>();
  for (const rejection of rejections) {
    rejectedIndices.add(rejection.operationIndex);
    const operation = transaction.operations[rejection.operationIndex];
    await saveSyncError(database, {
      transactionId: transaction.transactionId,
      operationIndex: rejection.operationIndex,
      entity: operation?.table ?? 'unknown',
      entityId: operation?.id ?? 'unknown',
      operation: operation?.op ?? 'unknown',
      code: rejection.code,
      message: rejection.message,
      payload: operation?.data,
    });
  }

  // The server applies each transaction atomically. Record valid siblings too,
  // otherwise completing the local transaction would silently discard them.
  if (rejections.length > 0) {
    for (const [
      operationIndex,
      operation,
    ] of transaction.operations.entries()) {
      if (rejectedIndices.has(operationIndex)) continue;
      await saveSyncError(database, {
        transactionId: transaction.transactionId,
        operationIndex,
        entity: operation.table,
        entityId: operation.id,
        operation: operation.op,
        code: 'transaction_rejected',
        message:
          'Another operation caused the atomic transaction to be rejected',
        payload: operation.data,
      });
    }
  }
}
