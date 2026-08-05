import { UpdateType, type AbstractPowerSyncDatabase } from '@powersync/web';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncMocks = vi.hoisted(() => ({
  fetchSyncCredentials: vi.fn(),
  getDbAccessToken: vi.fn(),
  updateResult: {
    error: {
      code: '23505',
      message: 'duplicate key',
      details: '',
      hint: '',
      name: 'PostgrestError',
    },
  },
}));

vi.mock('~/data/sync/credential', () => ({
  fetchSyncCredentials: syncMocks.fetchSyncCredentials,
  getDbAccessToken: syncMocks.getDbAccessToken,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue(syncMocks.updateResult),
      })),
    })),
  })),
}));

import { SupabaseConnector } from '~/data/sync/SupabaseConnector';

describe('legacy Supabase connector', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps rejected operations queued instead of silently discarding them', async () => {
    const complete = vi.fn();
    const database = {
      getNextCrudTransaction: vi.fn().mockResolvedValue({
        crud: [
          {
            op: UpdateType.PATCH,
            table: 'goal',
            id: 'goal-a',
            opData: { title: 'Changed' },
          },
        ],
        complete,
      }),
    } as unknown as AbstractPowerSyncDatabase;
    const connector = new SupabaseConnector('account-a');

    await expect(connector.uploadData(database)).rejects.toMatchObject({
      code: '23505',
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
