import { WORKSPACE_CHANGE_KEY } from '~/constants/storage';

/** Notify other tabs after the active descriptor has changed. */
export function notifyWorkspaceChanged(workspaceId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      WORKSPACE_CHANGE_KEY,
      JSON.stringify({ workspaceId, changedAt: new Date().toISOString() }),
    );
  } catch {
    // Workspace changes must still succeed when storage is unavailable.
  }
}

/** Give other tabs a brief chance to reload and release the replaced DB. */
export function waitForWorkspaceTabs(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, 75));
}
