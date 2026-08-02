import db from '~/data/db/database';
import type { GoalEditableFields } from '~/features/goal/model';
import { generateUUIDs } from '~/utils';
import { updateGoalProgress } from './progress';

/** Leaves room below the sync endpoint's 500-operation transaction limit. */
const GOAL_DELETE_ENTRY_BATCH_SIZE = 400;

export async function createGoal({
  title,
  target,
  unit,
  startDate,
  targetDate,
  initialValue,
  type,
}: GoalEditableFields) {
  const { uuid, shortUuid } = generateUUIDs();

  await db
    .insertInto('goal')
    .values({
      id: uuid,
      shortId: shortUuid as string,
      title,
      initialValue,
      target,
      unit,
      startDate,
      targetDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      type,
      currentValue: initialValue,
    })
    .executeTakeFirstOrThrow();

  return { goalId: uuid };
}

export async function updateGoal(
  goalId: string,
  {
    title,
    target,
    unit,
    startDate,
    targetDate,
    initialValue,
    type,
  }: GoalEditableFields,
  { completionCriteriaChanged }: { completionCriteriaChanged?: boolean } = {},
) {
  await db.transaction().execute(async (tx) => {
    const [, latestEntry] = await Promise.all([
      tx
        .updateTable('goal')
        .set({
          title,
          initialValue,
          target,
          unit,
          startDate,
          targetDate,
          updatedAt: new Date().toISOString(),
          type,
        })
        .where('id', '=', goalId)
        .executeTakeFirstOrThrow(),
      completionCriteriaChanged &&
        tx
          .selectFrom('entry')
          .select('date')
          .where((eb) =>
            eb.and([eb('goalId', '=', goalId), eb('value', '>', 0)]),
          )
          .orderBy('date', 'desc')
          .limit(1)
          .executeTakeFirst(),
    ]);
    if (completionCriteriaChanged) {
      await updateGoalProgress(
        goalId,
        tx,
        latestEntry ? new Date(latestEntry.date) : undefined,
      );
    }
  });
}

export async function archiveGoal(goalId: string) {
  const timestamp = new Date().toISOString();

  await db
    .updateTable('goal')
    .set({ archivedAt: timestamp, updatedAt: timestamp })
    .where('id', '=', goalId)
    .executeTakeFirstOrThrow();
}

export async function unarchiveGoal(goalId: string) {
  const timestamp = new Date().toISOString();

  await db
    .updateTable('goal')
    .set({ archivedAt: null, updatedAt: timestamp })
    .where('id', '=', goalId)
    .executeTakeFirstOrThrow();
}

export async function deleteGoal(goalId: string) {
  let deletedGoal = false;

  while (!deletedGoal) {
    await db.transaction().execute(async (tx) => {
      const entries = await tx
        .selectFrom('entry')
        .select('id')
        .where('goalId', '=', goalId)
        .limit(GOAL_DELETE_ENTRY_BATCH_SIZE)
        .execute();

      if (entries.length > 0) {
        await tx
          .deleteFrom('entry')
          .where(
            'id',
            'in',
            entries.map(({ id }) => id),
          )
          .execute();
      }

      if (entries.length < GOAL_DELETE_ENTRY_BATCH_SIZE) {
        await tx.deleteFrom('goal').where('id', '=', goalId).execute();
        deletedGoal = true;
      }
    });
  }
}
