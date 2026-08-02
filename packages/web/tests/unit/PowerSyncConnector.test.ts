import { UpdateType, type AbstractPowerSyncDatabase } from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PowerSyncConnector } from '../../src/data/sync/PowerSyncConnector';
import type {
  SyncTransactionResult,
  SyncTransport,
} from '../../src/data/sync/SyncTransport';
import { HttpSyncTransport } from '../../src/data/sync/SyncTransport';
import { WORKSPACE_OWNER_HEADER } from '../../src/data/sync/workspaceAccount';
import type { WorkspaceDescriptor } from '../../src/data/workspace';
import { APIError } from '../../src/utils/errors';

const workspace: WorkspaceDescriptor = {
  version: 1,
  id: '019b2f0e-7c32-7000-8000-000000000001',
  clientId: '019b2f0e-7c32-7000-8000-000000000002',
  databaseFilename: 'seon-workspace-019b2f0e-7c32-7000-8000-000000000001.db',
  storageBackend: 'indexeddb',
  kind: 'account',
  syncBinding: {
    provider: 'powersync',
    ownerAccountId: '019b2f0e-7c32-7000-8000-000000000003',
  },
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
};

function createTransport(
  result: SyncTransactionResult = {
    result: true,
    transactionId: '91',
    status: 'applied',
    rejected: [],
  },
) {
  return {
    getCredentials: vi.fn().mockResolvedValue({
      endpoint: 'https://sync.example.com',
      token: 'token',
    }),
    uploadTransaction: vi.fn().mockResolvedValue(result),
  } satisfies SyncTransport;
}

function createDatabase(options: {
  table?: string;
  result?: SyncTransactionResult;
  includeEntry?: boolean;
}) {
  const complete = vi.fn().mockResolvedValue(undefined);
  const execute = vi.fn().mockResolvedValue({ rowsAffected: 1 });
  const crud: Array<{
    clientId: number;
    transactionId: number;
    table: string;
    op: UpdateType;
    id: string;
    opData: Record<string, unknown>;
  }> = [
    {
      clientId: 44,
      transactionId: 91,
      table: options.table ?? 'goal',
      op: UpdateType.PATCH,
      id: '019b2f0e-7c32-7000-8000-000000000004',
      opData: { title: 'Changed' },
    },
  ];
  const transaction = {
    transactionId: 91,
    crud,
    complete,
  };
  if (options.includeEntry) {
    transaction.crud.push({
      clientId: 45,
      transactionId: 91,
      table: 'entry',
      op: UpdateType.PATCH,
      id: '019b2f0e-7c32-7000-8000-000000000005',
      opData: { value: 2 },
    });
  }
  const database = {
    getNextCrudTransaction: vi.fn().mockResolvedValue(transaction),
    execute,
  } as unknown as AbstractPowerSyncDatabase;

  return { database, complete, execute };
}

describe('PowerSyncConnector', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('binds every HTTP sync request to the workspace owner', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: true,
            endpoint: 'https://sync.example.com',
            token: 'token',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: true,
            transactionId: '91',
            status: 'applied',
            rejected: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    const transport = new HttpSyncTransport(
      workspace.syncBinding.ownerAccountId,
    );

    await transport.getCredentials();
    await transport.uploadTransaction({
      clientId: workspace.clientId,
      transactionId: '91',
      operations: [
        {
          table: 'goal',
          op: 'PATCH',
          id: '019b2f0e-7c32-7000-8000-000000000004',
          data: { title: 'Changed' },
        },
      ],
    });

    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get(WORKSPACE_OWNER_HEADER)).toBe(
        workspace.syncBinding.ownerAccountId,
      );
    }
  });

  it('uses the persisted workspace client id and transaction id', async () => {
    const transport = createTransport();
    const connector = new PowerSyncConnector({ workspace, transport });
    const { database, complete } = createDatabase({});

    await connector.uploadData(database);

    expect(transport.uploadTransaction).toHaveBeenCalledWith({
      clientId: workspace.clientId,
      transactionId: '91',
      operations: [
        {
          table: 'goal',
          op: 'PATCH',
          id: '019b2f0e-7c32-7000-8000-000000000004',
          data: { title: 'Changed' },
        },
      ],
    });
    expect(complete).toHaveBeenCalledOnce();
  });

  it('stores explicit server rejections locally before completing', async () => {
    const transport = createTransport({
      result: true,
      transactionId: '91',
      status: 'rejected',
      rejected: [
        {
          operationIndex: 0,
          code: 'invalid_field',
          message: 'title is invalid',
        },
      ],
    });
    const connector = new PowerSyncConnector({ workspace, transport });
    const { database, complete, execute } = createDatabase({
      includeEntry: true,
    });

    await connector.uploadData(database);

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0]?.[0]).toContain('INSERT INTO sync_error');
    expect(execute.mock.calls[1]?.[1]?.[6]).toBe('transaction_rejected');
    expect(complete).toHaveBeenCalledOnce();
  });

  it('keeps transient failures queued for retry', async () => {
    const transport = createTransport();
    vi.mocked(transport.uploadTransaction).mockRejectedValue(
      new TypeError('Network unavailable'),
    );
    const connector = new PowerSyncConnector({ workspace, transport });
    const { database, complete } = createDatabase({});

    await expect(connector.uploadData(database)).rejects.toThrow(
      'Network unavailable',
    );
    expect(complete).not.toHaveBeenCalled();
  });

  it('disconnects and keeps uploads queued on an account mismatch', async () => {
    const transport = createTransport();
    vi.mocked(transport.uploadTransaction).mockRejectedValue(
      new APIError({
        message: 'Workspace account mismatch',
        status: 409,
        statusText: 'Conflict',
      }),
    );
    const onAuthenticationRequired = vi.fn();
    const connector = new PowerSyncConnector({
      workspace,
      transport,
      onAuthenticationRequired,
    });
    const { database, complete } = createDatabase({});

    await expect(connector.uploadData(database)).rejects.toThrow(
      'Workspace account mismatch',
    );
    expect(onAuthenticationRequired).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
  });

  it('latches unauthorized credentials until authentication changes', async () => {
    const transport = createTransport();
    vi.mocked(transport.getCredentials)
      .mockRejectedValueOnce(
        new APIError({ message: 'Unauthorized', status: 401, statusText: '' }),
      )
      .mockResolvedValue({
        endpoint: 'https://sync.example.com',
        token: 'new-token',
      });
    const onAuthenticationRequired = vi.fn();
    const connector = new PowerSyncConnector({
      workspace,
      transport,
      onAuthenticationRequired,
    });

    await expect(connector.fetchCredentials()).resolves.toBeNull();
    await expect(connector.fetchCredentials()).resolves.toBeNull();
    expect(transport.getCredentials).toHaveBeenCalledOnce();
    expect(onAuthenticationRequired).toHaveBeenCalledOnce();

    connector.markAuthenticated();
    await expect(connector.fetchCredentials()).resolves.toMatchObject({
      token: 'new-token',
    });
    expect(transport.getCredentials).toHaveBeenCalledTimes(2);
  });

  it('records unsupported local entities without sending a partial upload', async () => {
    const transport = createTransport();
    const connector = new PowerSyncConnector({ workspace, transport });
    const { database, complete, execute } = createDatabase({
      table: 'unexpected_table',
      includeEntry: true,
    });

    await connector.uploadData(database);

    expect(transport.uploadTransaction).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0]?.[1]?.[6]).toBe('unsupported_entity');
    expect(execute.mock.calls[1]?.[1]?.[6]).toBe('transaction_rejected');
    expect(complete).toHaveBeenCalledOnce();
  });
});
