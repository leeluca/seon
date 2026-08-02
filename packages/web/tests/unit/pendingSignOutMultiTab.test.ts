import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');

function installExclusiveLock() {
  let tail: Promise<unknown> = Promise.resolve();
  const request = vi.fn(
    <T>(
      _name: string,
      _options: LockOptions,
      callback: () => Promise<T>,
    ): Promise<T> => {
      const result = tail.then(callback);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  );
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request },
  });
  return request;
}

beforeEach(async () => {
  localStorage.clear();
  authMocks.signOut.mockReset();
  vi.resetModules();
  const { clearPendingSignOut } = await import(
    '../../src/data/workspace/pendingSignOut'
  );
  await clearPendingSignOut();
  vi.resetModules();
});

afterEach(() => {
  if (originalLocks) {
    Object.defineProperty(navigator, 'locks', originalLocks);
  } else {
    Reflect.deleteProperty(navigator, 'locks');
  }
});

describe('pending sign out across tabs', () => {
  it('lets a waiting tab observe completion without sending another request', async () => {
    const requestLock = installExclusiveLock();
    const tabA = await import('../../src/data/workspace/pendingSignOut');
    vi.resetModules();
    const tabB = await import('../../src/data/workspace/pendingSignOut');
    await tabA.markPendingSignOut('account-a');

    let finishSignOut: ((response: unknown) => void) | undefined;
    authMocks.signOut.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSignOut = resolve;
      }) as never,
    );

    const first = tabA.flushPendingSignOut();
    await vi.waitFor(() => expect(authMocks.signOut).toHaveBeenCalledOnce());
    const second = tabB.flushPendingSignOut();

    expect(requestLock).toHaveBeenCalledTimes(2);
    expect(authMocks.signOut).toHaveBeenCalledOnce();
    finishSignOut?.({ data: { success: true }, error: null });

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(authMocks.signOut).toHaveBeenCalledOnce();
    expect(await tabA.hasPendingSignOut()).toBe(false);
  });
});
