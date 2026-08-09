import { describe, expect, it, vi } from 'vitest';

import {
  createBackgroundTaskTracker,
  createWaitUntilBackgroundTaskHandler,
} from '../../../src/runtime/background.js';

describe('Node background task tracking', () => {
  it('does not block deferral and drains outstanding work', async () => {
    let resolveTask: (() => void) | undefined;
    const task = new Promise<void>((resolve) => {
      resolveTask = resolve;
    });
    const tracker = createBackgroundTaskTracker();

    tracker.defer(task);
    expect(tracker.pendingCount()).toBe(1);

    resolveTask?.();
    await tracker.drain();
    expect(tracker.pendingCount()).toBe(0);
  });

  it('logs rejected work without rejecting shutdown', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const tracker = createBackgroundTaskTracker();

    tracker.defer(Promise.reject(new Error('email failed')));
    await expect(tracker.drain()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('background_task_failed'),
    );
    consoleError.mockRestore();
  });
});

describe('Worker background task handling', () => {
  it('passes deferred work to the request execution context', () => {
    const waitUntil = vi.fn();
    const task = Promise.resolve();

    createWaitUntilBackgroundTaskHandler({ waitUntil })(task);

    expect(waitUntil).toHaveBeenCalledWith(task);
  });
});
