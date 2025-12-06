import db from '~/data/db/database';
import type { GoalEditableFields } from '~/features/goal/model';
import { generateUUIDs } from '~/utils';
import { updateGoalProgress } from './progress';

export async function createGoal({
  title,
  target,
  unit,
  startDate,
  targetDate,
  initialValue,
  userId,
  type,
}: GoalEditableFields & { userId: string }) {
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
      userId,
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
  await db.deleteFrom('goal').where('id', '=', goalId).execute();
}
