import { describe, expect, it, vi } from 'vitest';

import { getLocalWorkspaceSummary } from '../../src/data/workspace/accountLifecycle';

describe('local workspace summary', () => {
  it('treats unresolved sync errors as unsynced local changes', async () => {
    const get = vi.fn(async (sql: string) => {
      if (sql.includes('FROM goal')) return { count: 2 };
      if (sql.includes('FROM entry')) return { count: 3 };
      if (sql.includes('FROM sync_error')) return { count: 4 };
      throw new Error(`Unexpected query: ${sql}`);
    });
    const database = {
      init: vi.fn().mockResolvedValue(undefined),
      get,
      getUploadQueueStats: vi.fn().mockResolvedValue({ count: 0 }),
    };

    await expect(getLocalWorkspaceSummary(database as never)).resolves.toEqual({
      goalCount: 2,
      entryCount: 3,
      pendingUploadCount: 0,
      unresolvedSyncErrorCount: 4,
      hasData: true,
      hasUnsyncedChanges: true,
    });
    expect(get).toHaveBeenCalledWith(
      'SELECT count(*) AS count FROM sync_error WHERE resolvedAt IS NULL',
    );
  });
});
