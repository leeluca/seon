import type { Kysely } from '@powersync/kysely-driver';

import type { Database } from './powersync/AppSchema';

// TODO: move to services folder?
export async function updateGoalProgress(goalId: string, tx: Kysely<Database>) {
  const goal = await tx
    .selectFrom('goal')
    .select(['id', 'initialValue', 'target', 'type'])
    .where('id', '=', goalId)
    .executeTakeFirst();

  if (!goal) {
    console.warn(`Goal with id ${goalId} not found during progress update.`);
    return;
  }

  let currentValue: number;

  if (goal.type === 'PROGRESS') {
    // For PROGRESS type, get the value of the latest entry
    const latestEntry = await tx
      .selectFrom('entry')
      .select('value')
      .where('goalId', '=', goalId)
      .orderBy('date', 'desc')
      .limit(1)
      .executeTakeFirst();
    currentValue = (latestEntry?.value ?? 0) + goal.initialValue;
  } else {
    // Else, sum all entry values
    const sumResult = await tx
      .selectFrom('entry')
      .select(tx.fn.sum('value').as('totalValue'))
      .where('goalId', '=', goalId)
      .executeTakeFirst();
    currentValue = (Number(sumResult?.totalValue) || 0) + goal.initialValue;
  }

  await tx
    .updateTable('goal')
    .set({ currentValue })
    .where('id', '=', goalId)
    .execute();
}
