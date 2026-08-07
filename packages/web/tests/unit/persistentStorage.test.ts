import { afterEach, describe, expect, it, vi } from 'vitest';

const { captureException } = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock('@sentry/react', () => ({ captureException }));

import { purgeOpfsStorage, requestPersistentStorage } from '~/data/db/storage';

describe('requestPersistentStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when persistent storage is unsupported', async () => {
    vi.stubGlobal('navigator', { storage: {} });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('does not request persistence again when it was already granted', async () => {
    const persisted = vi.fn().mockResolvedValue(true);
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { storage: { persisted, persist } });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persisted).toHaveBeenCalledTimes(1);
    expect(persist).not.toHaveBeenCalled();
  });

  it('returns whether persistence was granted', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { storage: { persist } });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps storage usable when the request fails', async () => {
    const error = new DOMException('Permission request failed', 'AbortError');
    vi.stubGlobal('navigator', {
      storage: { persist: vi.fn().mockRejectedValue(error) },
    });

    await expect(requestPersistentStorage()).resolves.toBe(false);
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { storage_error: 'request_persistent_storage' },
    });
  });
});

describe('purgeOpfsStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attempts every entry and rejects when any deletion fails', async () => {
    const deletionError = new DOMException(
      'File is locked',
      'NoModificationAllowedError',
    );
    const removeEntry = vi
      .fn()
      .mockRejectedValueOnce(deletionError)
      .mockResolvedValueOnce(undefined);
    const root = {
      async *entries() {
        yield ['locked.db', { kind: 'file' }] as const;
        yield ['cache', { kind: 'directory' }] as const;
      },
      removeEntry,
    };
    vi.stubGlobal('navigator', {
      storage: { getDirectory: vi.fn().mockResolvedValue(root) },
    });

    await expect(purgeOpfsStorage()).rejects.toMatchObject({
      name: 'AggregateError',
      errors: [
        expect.objectContaining({
          message: 'Failed to delete file: locked.db',
        }),
      ],
    });
    expect(removeEntry).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenCalledWith(deletionError, {
      extra: { message: 'Failed to delete file: locked.db' },
      tags: { storage_error: 'purge_opfs_storage' },
    });
  });
});
