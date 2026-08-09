import type { BackgroundTaskHandler } from '../auth/auth.js';

export interface BackgroundTaskTracker {
  defer: BackgroundTaskHandler;
  drain(): Promise<void>;
  pendingCount(): number;
}

export interface WaitUntilContext {
  waitUntil(promise: Promise<unknown>): void;
}

export function createWaitUntilBackgroundTaskHandler(
  context: WaitUntilContext,
): BackgroundTaskHandler {
  return (promise) => context.waitUntil(promise);
}

export function createBackgroundTaskTracker(): BackgroundTaskTracker {
  const pending = new Set<Promise<unknown>>();

  const defer: BackgroundTaskHandler = (promise) => {
    const tracked = promise
      .catch((error: unknown) => {
        console.error(
          JSON.stringify({
            event: 'background_task_failed',
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      })
      .finally(() => {
        pending.delete(tracked);
      });
    pending.add(tracked);
  };

  return {
    defer,
    async drain() {
      while (pending.size > 0) {
        await Promise.allSettled([...pending]);
      }
    },
    pendingCount: () => pending.size,
  };
}
