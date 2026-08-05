import { afterEach, describe, expect, it, vi } from 'vitest';

const { captureException } = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock('@sentry/react', () => ({ captureException }));

import { requestPersistentStorage } from '~/data/db/storage';

describe('requestPersistentStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns undefined when persistent storage is unsupported', async () => {
    vi.stubGlobal('navigator', { storage: {} });

    await expect(requestPersistentStorage()).resolves.toBeUndefined();
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
