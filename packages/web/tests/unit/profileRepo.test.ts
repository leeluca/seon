import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  executeTakeFirstOrThrow: vi.fn().mockResolvedValue(undefined),
  requestPersistentStorage: vi.fn().mockResolvedValue(true),
}));

vi.mock('~/data/db/database', () => ({
  default: {
    insertInto: () => ({
      values: () => ({
        executeTakeFirstOrThrow: mocks.executeTakeFirstOrThrow,
      }),
    }),
  },
}));

vi.mock('~/data/db/storage', () => ({
  requestPersistentStorage: mocks.requestPersistentStorage,
}));

import { initializeLocalProfile } from '~/data/domain/profileRepo';

describe('initializeLocalProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests persistent storage only after the local profile is saved', async () => {
    await initializeLocalProfile({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Local user',
      email: null,
      preferences: null,
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });

    expect(mocks.executeTakeFirstOrThrow).toHaveBeenCalledOnce();
    expect(mocks.requestPersistentStorage).toHaveBeenCalledOnce();
    expect(
      mocks.executeTakeFirstOrThrow.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.requestPersistentStorage.mock.invocationCallOrder[0]);
  });
});
