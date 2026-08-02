import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => {
  let entryIds: string[] = [];
  const deletedEntryBatches: string[][] = [];
  let goalDeleteCount = 0;

  const transaction = {
    selectFrom: () => ({
      select: () => ({
        where: () => ({
          limit: (size: number) => ({
            execute: async () => entryIds.slice(0, size).map((id) => ({ id })),
          }),
        }),
      }),
    }),
    deleteFrom: (table: 'entry' | 'goal') => ({
      where: (_field: string, _operator: string, value: unknown) => ({
        execute: async () => {
          if (table === 'goal') {
            goalDeleteCount += 1;
            return;
          }

          const ids = value as string[];
          deletedEntryBatches.push(ids);
          const deleted = new Set(ids);
          entryIds = entryIds.filter((id) => !deleted.has(id));
        },
      }),
    }),
  };

  return {
    db: {
      transaction: () => ({
        execute: async (callback: (tx: typeof transaction) => Promise<void>) =>
          callback(transaction),
      }),
    },
    reset(count: number) {
      entryIds = Array.from({ length: count }, (_, index) => `entry-${index}`);
      deletedEntryBatches.length = 0;
      goalDeleteCount = 0;
    },
    deletedEntryBatches,
    getGoalDeleteCount: () => goalDeleteCount,
  };
});

vi.mock('~/data/db/database', () => ({ default: database.db }));

import { deleteGoal } from '~/data/domain/goalRepo';

describe('deleteGoal', () => {
  beforeEach(() => database.reset(0));

  it('removes entries before their goal without exceeding uploadable batches', async () => {
    database.reset(401);

    await deleteGoal('goal-id');

    expect(database.deletedEntryBatches.map((batch) => batch.length)).toEqual([
      400, 1,
    ]);
    expect(database.getGoalDeleteCount()).toBe(1);
  });
});
