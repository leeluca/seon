import { AUTH_CHANGE_KEY } from '~/constants/storage';

export type AuthSessionChangeReason = 'session-changed' | 'password-reset';

export function notifyAuthSessionChanged(
  reason: AuthSessionChangeReason = 'session-changed',
): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      AUTH_CHANGE_KEY,
      JSON.stringify({
        changedAt: new Date().toISOString(),
        nonce: crypto.randomUUID(),
        reason,
      }),
    );
  } catch {
    // Server-side account binding remains the correctness boundary when
    // browser storage is unavailable.
  }
}
