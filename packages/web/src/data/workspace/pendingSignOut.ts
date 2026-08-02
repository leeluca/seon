import { PENDING_SIGN_OUT_KEY } from '~/constants/storage';
import { authClient, toAuthClientError } from '~/lib/auth-client';

export interface PendingSignOut {
  version: 1;
  accountId: string;
  requestedAt: string;
}

let activeFlush: Promise<boolean> | null = null;
const PENDING_SIGN_OUT_LOCK = 'seon.pending-sign-out.flush.v1';

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function getPendingSignOut(): PendingSignOut | null {
  const serialized = storage()?.getItem(PENDING_SIGN_OUT_KEY);
  if (!serialized) return null;

  try {
    const value = JSON.parse(serialized) as Partial<PendingSignOut>;
    if (
      value.version === 1 &&
      typeof value.accountId === 'string' &&
      typeof value.requestedAt === 'string'
    ) {
      return value as PendingSignOut;
    }
  } catch {
    // Invalid state must not indefinitely lock the user out.
  }
  storage()?.removeItem(PENDING_SIGN_OUT_KEY);
  return null;
}

export function hasPendingSignOut(): boolean {
  return getPendingSignOut() !== null;
}

export function markPendingSignOut(accountId: string): PendingSignOut {
  const pending: PendingSignOut = {
    version: 1,
    accountId,
    requestedAt: new Date().toISOString(),
  };
  storage()?.setItem(PENDING_SIGN_OUT_KEY, JSON.stringify(pending));
  return pending;
}

export function clearPendingSignOut(): void {
  storage()?.removeItem(PENDING_SIGN_OUT_KEY);
}

async function performPendingSignOutFlush(): Promise<boolean> {
  if (!hasPendingSignOut()) return true;

  try {
    const response = await authClient.signOut();
    if (response.error) {
      // An already-expired session is equivalent to a completed revocation.
      if (response.error.status !== 401) return false;
    }
    clearPendingSignOut();
    return true;
  } catch (error) {
    const authError = toAuthClientError(error, 'Unable to finish sign out');
    if (authError.status === 401) {
      clearPendingSignOut();
      return true;
    }
    return false;
  }
}

function withPendingSignOutLock(
  callback: () => Promise<boolean>,
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.locks) return callback();

  return navigator.locks.request(
    PENDING_SIGN_OUT_LOCK,
    { mode: 'exclusive' },
    callback,
  );
}

/**
 * Returns false for connectivity/server failures so an online retry can run.
 * Concurrent callers in this tab share one promise. The browser lock extends
 * that serialization to other tabs, which recheck the shared marker after
 * acquiring it and cannot clear a newer session with a stale response.
 */
export async function flushPendingSignOut(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (activeFlush) return activeFlush;

  activeFlush = withPendingSignOutLock(performPendingSignOutFlush);
  try {
    return await activeFlush;
  } finally {
    activeFlush = null;
  }
}
