import { describe, expect, it, vi } from 'vitest';

function mockResetModule(options: {
  storageBackend: 'opfs' | 'indexeddb';
  purgeOpfsError?: unknown;
  purgeIdbError?: unknown;
}) {
  vi.resetModules();

  const captureException = vi.fn();
  vi.doMock('@sentry/react', () => ({
    default: {},
    captureException,
  }));

  const disconnect = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);

  vi.doMock('~/data/db/database', () => ({
    DB_NAME: 'seon-goals.db',
    powerSyncDb: {
      disconnect,
      close,
    },
    storageBackend: options.storageBackend,
  }));

  const purgeOpfsStorage = vi
    .fn()
    .mockImplementation(() =>
      options.purgeOpfsError
        ? Promise.reject(options.purgeOpfsError)
        : Promise.resolve(),
    );
  const purgeIndexedDbStorage = vi
    .fn()
    .mockImplementation(() =>
      options.purgeIdbError
        ? Promise.reject(options.purgeIdbError)
        : Promise.resolve(),
    );

  vi.doMock('~/data/db/storage', () => ({
    purgeOpfsStorage,
    purgeIndexedDbStorage,
  }));

  return {
    captureException,
    disconnect,
    close,
    purgeOpfsStorage,
    purgeIndexedDbStorage,
  };
}

describe('resetLocalDatabase', () => {
  it('purges OPFS when storageBackend=opfs', async () => {
    const mocks = mockResetModule({ storageBackend: 'opfs' });
    const { resetLocalDatabase } = await import('~/data/db/reset');

    await expect(resetLocalDatabase()).resolves.toBeUndefined();

    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.close).toHaveBeenCalledTimes(1);
    expect(mocks.purgeOpfsStorage).toHaveBeenCalledTimes(1);
    expect(mocks.purgeIndexedDbStorage).not.toHaveBeenCalled();
  });

  it('purges IndexedDB when storageBackend=indexeddb', async () => {
    const mocks = mockResetModule({ storageBackend: 'indexeddb' });
    const { resetLocalDatabase } = await import('~/data/db/reset');

    await expect(resetLocalDatabase()).resolves.toBeUndefined();

    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.close).toHaveBeenCalledTimes(1);
    expect(mocks.purgeOpfsStorage).not.toHaveBeenCalled();
    expect(mocks.purgeIndexedDbStorage).toHaveBeenCalledTimes(1);
    expect(mocks.purgeIndexedDbStorage).toHaveBeenCalledWith('seon-goals.db');
  });

  it('does not throw when purge fails (private-mode behavior)', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const purgeError = new DOMException('blocked', 'UnknownError');
    const mocks = mockResetModule({
      storageBackend: 'indexeddb',
      purgeIdbError: purgeError,
    });

    const { resetLocalDatabase } = await import('~/data/db/reset');

    await expect(resetLocalDatabase()).resolves.toBeUndefined();
    expect(mocks.purgeIndexedDbStorage).toHaveBeenCalledTimes(1);

    expect(mocks.captureException).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
