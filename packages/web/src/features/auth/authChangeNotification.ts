import { AUTH_CHANGE_KEY } from '~/constants/storage';

export function notifyAuthSessionChanged(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      AUTH_CHANGE_KEY,
      JSON.stringify({
        changedAt: new Date().toISOString(),
        nonce: crypto.randomUUID(),
      }),
    );
  } catch {
    // Server-side account binding remains the correctness boundary when
    // browser storage is unavailable.
  }
}
