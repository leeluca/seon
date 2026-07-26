import { PENDING_SIGN_OUT_KEY } from '~/constants/storage';
import { authClient, toAuthClientError } from '~/lib/auth-client';

export interface PendingSignOut {
  version: 1;
  accountId: string;
  requestedAt: string;
}

let activeFlush: Promise<boolean> | null = null;

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

/**
 * Returns false for connectivity/server failures so an online retry can run.
 * Concurrent callers share one request so a retry cannot race a new sign-in
 * and clear the newly issued session cookie.
 */
export async function flushPendingSignOut(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (activeFlush) return activeFlush;

  activeFlush = performPendingSignOutFlush();
  try {
    return await activeFlush;
  } finally {
    activeFlush = null;
  }
}
