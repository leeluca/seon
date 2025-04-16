import db from '~/lib/database';
import type { GoalEditableFields } from '~/types/goal';
import { generateUUIDs } from '~/utils';
import { updateGoalProgress } from './progress';

export async function handleSave(
  {
    title,
    target,
    unit,
    startDate,
    targetDate,
    initialValue,
    userId,
    type,
  }: GoalEditableFields & { userId: string },
  { callback, onError }: { callback?: () => void; onError?: () => void } = {},
) {
  const { uuid, shortUuid } = generateUUIDs();

  try {
    await db
      .insertInto('goal')
      .values({
        id: uuid,
        shortId: shortUuid as string,
        title,
        initialValue,
        target: target,
        unit,
        userId,
        startDate: startDate,
        targetDate: targetDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type,
        currentValue: initialValue,
      })
      .executeTakeFirstOrThrow();

    callback?.();
  } catch (error) {
    console.error(error);
    onError?.();
  }
}

export async function handleUpdate(
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
  {
    callback,
    onError,
    completionCriteriaChanged,
  }: {
    callback?: () => void;
    onError?: () => void;
    completionCriteriaChanged?: boolean;
  } = {},
) {
  try {
    await db.transaction().execute(async (tx) => {
      const [, latestEntry] = await Promise.all([
        tx
          .updateTable('goal')
          .set({
            title,
            initialValue,
            target: target,
            unit,
            startDate: startDate,
            targetDate: targetDate,
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

    callback?.();
  } catch (error) {
    console.error(error);
    onError?.();
  }
}

export async function deleteGoal(goalId: string, callback?: () => void) {
  await db.deleteFrom('goal').where('id', '=', goalId).execute();
  callback?.();
}
