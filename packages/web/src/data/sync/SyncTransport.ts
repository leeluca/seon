import fetcher from '~/apis/fetcher';
import { createWorkspaceOwnerHeaders } from './workspaceAccount';

export type SyncEntity = 'goal' | 'entry' | 'profile';
export type SyncOperationType = 'PUT' | 'PATCH' | 'DELETE';

export interface SyncOperation {
  table: SyncEntity;
  op: SyncOperationType;
  id: string;
  data?: Record<string, unknown>;
}

export interface SyncTransaction {
  clientId: string;
  transactionId: string;
  operations: SyncOperation[];
}

export interface SyncRejection {
  operationIndex: number;
  code: string;
  message: string;
}

export interface SyncTransactionResult {
  result: true;
  transactionId: string;
  status: 'applied' | 'duplicate' | 'rejected';
  rejected: SyncRejection[];
}

export interface SyncCredentials {
  endpoint: string;
  token: string;
  expiresAt?: string;
}

/**
 * Provider-neutral boundary used by the local database adapter. PowerSync is
 * responsible for change capture/downloads today; it never talks directly to
 * the application database.
 */
export interface SyncTransport {
  getCredentials(): Promise<SyncCredentials>;
  uploadTransaction(
    transaction: SyncTransaction,
  ): Promise<SyncTransactionResult>;
}

interface SyncCredentialResponse {
  result: true;
  endpoint: string;
  token: string;
  expiresAt?: string;
}

export class HttpSyncTransport implements SyncTransport {
  constructor(private readonly ownerAccountId?: string) {}

  private ownerHeaders(options: { json?: boolean } = {}): Headers {
    if (!this.ownerAccountId) {
      throw new Error('An account workspace is required for remote sync');
    }
    return createWorkspaceOwnerHeaders(this.ownerAccountId, options);
  }

  async getCredentials(): Promise<SyncCredentials> {
    const { endpoint, token, expiresAt } =
      await fetcher<SyncCredentialResponse>('/api/sync/credentials', {
        headers: this.ownerHeaders(),
      });

    return { endpoint, token, expiresAt };
  }

  uploadTransaction(
    transaction: SyncTransaction,
  ): Promise<SyncTransactionResult> {
    return fetcher<SyncTransactionResult>('/api/sync/transactions', {
      method: 'POST',
      headers: this.ownerHeaders({ json: true }),
      body: JSON.stringify(transaction),
    });
  }
}
