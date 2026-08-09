import { describe, expect, it, vi } from 'vitest';

import { shutdownNodeRuntime } from '../../../src/runtime/shutdown.js';

describe('Node shutdown', () => {
  it('drains background tasks before closing PostgreSQL', async () => {
    const order: string[] = [];
    const closeServer = vi.fn(async () => {
      order.push('server');
    });
    const drainBackgroundTasks = vi.fn(async () => {
      order.push('background');
    });
    const closeDatabase = vi.fn(async () => {
      order.push('database');
    });

    await shutdownNodeRuntime({
      closeServer,
      drainBackgroundTasks,
      closeDatabase,
    });

    expect(order).toEqual(['server', 'background', 'database']);
  });
});
