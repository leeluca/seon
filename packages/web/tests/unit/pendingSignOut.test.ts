import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

vi.mock('~/lib/auth-client', async () => {
  const actual =
    await vi.importActual<typeof import('~/lib/auth-client')>(
      '~/lib/auth-client',
    );

  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      signOut: authMocks.signOut,
    },
  };
});

import {
  clearPendingSignOut,
  flushPendingSignOut,
  getPendingSignOut,
  hasPendingSignOut,
  markPendingSignOut,
} from '../../src/data/workspace/pendingSignOut';

const accountId = '019b2f0e-7c32-7000-8000-000000000001';

describe('pending offline sign out', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    authMocks.signOut.mockReset();
  });

  it('persists only a revocation marker, not session credentials', () => {
    markPendingSignOut(accountId);

    expect(getPendingSignOut()).toMatchObject({ version: 1, accountId });
    expect(hasPendingSignOut()).toBe(true);
    expect(JSON.stringify(getPendingSignOut())).not.toContain('token');

    clearPendingSignOut();
    expect(hasPendingSignOut()).toBe(false);
  });

  it('keeps the marker on a network failure and clears it after revocation', async () => {
    markPendingSignOut(accountId);
    authMocks.signOut.mockRejectedValueOnce(new TypeError('offline'));

    await expect(flushPendingSignOut()).resolves.toBe(false);
    expect(hasPendingSignOut()).toBe(true);

    authMocks.signOut.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    } as never);
    await expect(flushPendingSignOut()).resolves.toBe(true);
    expect(hasPendingSignOut()).toBe(false);
  });

  it('does not start a server request while the browser is offline', async () => {
    markPendingSignOut(accountId);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    await expect(flushPendingSignOut()).resolves.toBe(false);
    expect(authMocks.signOut).not.toHaveBeenCalled();
    expect(hasPendingSignOut()).toBe(true);
  });

  it('shares one revocation request between concurrent callers', async () => {
    markPendingSignOut(accountId);
    let completeRequest: ((value: unknown) => void) | undefined;
    const response = new Promise((resolve) => {
      completeRequest = resolve;
    });
    authMocks.signOut.mockReturnValue(response as never);

    const first = flushPendingSignOut();
    const second = flushPendingSignOut();

    expect(authMocks.signOut).toHaveBeenCalledTimes(1);
    completeRequest?.({ data: { success: true }, error: null });
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(hasPendingSignOut()).toBe(false);
  });
});
