import { API_URL } from '~/constants';
import { APIError } from '~/utils/errors';

const AUTH_CHANGE_KEY = 'seon_auth_change_v1';
const PENDING_SIGN_OUT_KEY = 'seon_pending_sign_out_v1';
const AUTH_CHANGE_EVENT = 'seon:auth-change';
let pendingSignOutFallback: PendingSignOut | null = null;

export type AuthChange = {
  state: 'signed-in' | 'signed-out';
  userId: string | null;
  changedAt: number;
  nonce: string;
};

type PendingSignOut = {
  userId: string;
  requestedAt: number;
};

function createApiError(response: Response, payload?: unknown) {
  const errorPayload =
    typeof payload === 'object' && payload !== null && 'error' in payload
      ? (
          payload as {
            error?: { code?: unknown; message?: unknown } | string;
          }
        ).error
      : undefined;
  const message =
    typeof errorPayload === 'object' &&
    errorPayload !== null &&
    typeof errorPayload.message === 'string'
      ? errorPayload.message
      : typeof errorPayload === 'string'
        ? errorPayload
        : typeof payload === 'string'
          ? payload
          : response.statusText || 'Request failed';
  const code =
    typeof errorPayload === 'object' &&
    errorPayload !== null &&
    typeof errorPayload.code === 'string'
      ? errorPayload.code
      : undefined;

  return new APIError({
    message,
    status: response.status,
    statusText: response.statusText,
    code,
  });
}

async function readResponsePayload(response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json().catch(() => undefined);
  }
  const text = await response.text();
  return text || undefined;
}

export async function apiErrorFromResponse(response: Response) {
  return createApiError(response, await readResponsePayload(response));
}

export function clearLegacyPersistedAuthData() {
  try {
    sessionStorage.removeItem('seon_db_access_token');
    sessionStorage.removeItem('seon_db_access_token_exp');
  } catch {
    // Storage can be unavailable in private or constrained browser contexts.
  }

  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('seon_session_exp')) localStorage.removeItem(key);
    }
  } catch {
    // Legacy expiry hints are non-authoritative and safe to leave behind.
  }
}

export function getPendingSignOut(): PendingSignOut | null {
  try {
    const value = localStorage.getItem(PENDING_SIGN_OUT_KEY);
    return value
      ? (JSON.parse(value) as PendingSignOut)
      : pendingSignOutFallback;
  } catch {
    return pendingSignOutFallback;
  }
}

export function markPendingSignOut(userId: string) {
  pendingSignOutFallback = { userId, requestedAt: Date.now() };
  try {
    localStorage.setItem(
      PENDING_SIGN_OUT_KEY,
      JSON.stringify(pendingSignOutFallback),
    );
  } catch {
    // The in-memory marker still guarantees immediate local sign-out.
  }
}

export function clearPendingSignOut() {
  pendingSignOutFallback = null;
  try {
    localStorage.removeItem(PENDING_SIGN_OUT_KEY);
  } catch {
    // There is no persisted marker to clear when storage is unavailable.
  }
}

export function notifyAuthChange(
  state: AuthChange['state'],
  userId: string | null,
) {
  const change: AuthChange = {
    state,
    userId,
    changedAt: Date.now(),
    nonce: crypto.randomUUID(),
  };
  try {
    localStorage.setItem(AUTH_CHANGE_KEY, JSON.stringify(change));
  } catch {
    // Same-tab listeners still receive the custom event below.
  }
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: change }));
}

export function subscribeToAuthChanges(listener: (change: AuthChange) => void) {
  const onCustomEvent = (event: Event) => {
    listener((event as CustomEvent<AuthChange>).detail);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_CHANGE_KEY || !event.newValue) return;
    try {
      listener(JSON.parse(event.newValue) as AuthChange);
    } catch {
      // Ignore malformed coordination data from an older app version.
    }
  };

  window.addEventListener(AUTH_CHANGE_EVENT, onCustomEvent);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, onCustomEvent);
    window.removeEventListener('storage', onStorage);
  };
}

let refreshPromise: Promise<{ userId: string; expiresAt: number }> | null =
  null;

export async function refreshAccessSession() {
  if (getPendingSignOut()) {
    throw new APIError({
      message: 'Sign-out is pending',
      status: 401,
      statusText: 'Unauthorized',
      code: 'SIGN_OUT_PENDING',
    });
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Cache-Control': 'no-store' },
      });

      if (!response.ok) {
        const error = await apiErrorFromResponse(response);
        notifyAuthChange('signed-out', null);
        throw error;
      }

      return response.json() as Promise<{
        result: true;
        userId: string;
        expiresAt: number;
      }>;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function flushPendingSignOut() {
  const pending = getPendingSignOut();
  if (!pending || !navigator.onLine) return !pending;

  try {
    const response = await fetch(`${API_URL}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Cache-Control': 'no-store' },
    });
    if (!response.ok) return false;

    clearPendingSignOut();
    return true;
  } catch {
    return false;
  }
}
