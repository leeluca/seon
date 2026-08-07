import { PENDING_SIGN_OUT_KEY } from '~/constants/storage';
import { authClient, toAuthClientError } from '~/lib/auth-client';
import { IndexedDbWorkspaceMetadataStorage } from './registryStorage';

export interface PendingSignOut {
  version: 1;
  accountId: string;
  requestedAt: string;
}

let activeFlush: Promise<boolean> | null = null;
const PENDING_SIGN_OUT_LOCK = 'seon.pending-sign-out.flush.v1';
const PENDING_SIGN_OUT_METADATA_KEY = 'pending-sign-out';
const pendingSignOutStorage = new IndexedDbWorkspaceMetadataStorage(
  PENDING_SIGN_OUT_METADATA_KEY,
);

function notifyPendingSignOut(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      PENDING_SIGN_OUT_KEY,
      JSON.stringify({
        changedAt: new Date().toISOString(),
        nonce: crypto.randomUUID(),
      }),
    );
  } catch {
    // IndexedDB remains authoritative; this signal is only for other tabs.
  }
}

export async function getPendingSignOut(): Promise<PendingSignOut | null> {
  const value =
    (await pendingSignOutStorage.load()) as Partial<PendingSignOut> | null;
  if (
    value &&
    value.version === 1 &&
    typeof value.accountId === 'string' &&
    typeof value.requestedAt === 'string'
  ) {
    return value as PendingSignOut;
  }
  if (value !== null) await pendingSignOutStorage.clear();
  return null;
}

export async function hasPendingSignOut(): Promise<boolean> {
  return (await getPendingSignOut()) !== null;
}

export async function markPendingSignOut(
  accountId: string,
): Promise<PendingSignOut> {
  const pending: PendingSignOut = {
    version: 1,
    accountId,
    requestedAt: new Date().toISOString(),
  };
  await pendingSignOutStorage.save(pending);
  notifyPendingSignOut();
  return pending;
}

export async function clearPendingSignOut(): Promise<void> {
  await pendingSignOutStorage.clear();
}

async function performPendingSignOutFlush(): Promise<boolean> {
  const pending = await getPendingSignOut();
  if (!pending) return true;

  try {
    const session = await authClient.getSession({
      query: { disableCookieCache: true },
    });
    if (session.error) {
      if (session.error.status !== 401) return false;
      await clearPendingSignOut();
      return true;
    }
    if (!session.data || session.data.user.id !== pending.accountId) {
      // A newer login supersedes a stale sign-out request for another account.
      await clearPendingSignOut();
      return true;
    }
  } catch (error) {
    const authError = toAuthClientError(
      error,
      'Unable to identify the session awaiting sign out',
    );
    if (authError.status === 401) {
      await clearPendingSignOut();
      return true;
    }
    return false;
  }

  try {
    const response = await authClient.signOut();
    if (response.error) {
      // An already-expired session is equivalent to a completed revocation.
      if (response.error.status !== 401) return false;
    }
    await clearPendingSignOut();
    return true;
  } catch (error) {
    const authError = toAuthClientError(error, 'Unable to finish sign out');
    if (authError.status === 401) {
      await clearPendingSignOut();
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
