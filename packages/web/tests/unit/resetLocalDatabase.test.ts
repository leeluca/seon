import { describe, expect, it, vi } from 'vitest';

const workspace = {
  version: 1 as const,
  id: 'workspace-1',
  clientId: 'client-1',
  databaseFilename: 'seon-workspace-workspace-1.db',
  storageBackend: 'indexeddb' as const,
  kind: 'local' as const,
  syncBinding: null,
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
};

function mockResetModule(removeError?: unknown) {
  vi.resetModules();
  const captureException = vi.fn();
  const remove = removeError
    ? vi.fn().mockRejectedValue(removeError)
    : vi.fn().mockResolvedValue(undefined);

  vi.doMock('@sentry/react', () => ({ captureException }));
  vi.doMock('~/data/db/database', () => ({
    activeWorkspace: workspace,
    workspaceDatabaseFactory: { remove },
  }));

  return { captureException, remove };
}

describe('resetLocalDatabase', () => {
  it('removes only the explicitly active workspace', async () => {
    const mocks = mockResetModule();
    const { resetLocalDatabase } = await import('~/data/db/reset');

    await expect(resetLocalDatabase()).resolves.toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith(workspace);
  });

  it('reports storage failures without crashing the current UI', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const error = new DOMException('blocked', 'UnknownError');
    const mocks = mockResetModule(error);
    const { resetLocalDatabase } = await import('~/data/db/reset');

    await expect(resetLocalDatabase()).resolves.toBe(false);
    expect(mocks.captureException).toHaveBeenCalledWith(error, {
      tags: { storage_error: 'reset_db_purge_failed' },
      extra: {
        workspaceId: workspace.id,
        storageBackend: workspace.storageBackend,
        dbFilename: workspace.databaseFilename,
      },
    });
    consoleErrorSpy.mockRestore();
  });
});
