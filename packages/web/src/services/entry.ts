import db from '~/lib/database';
import { generateUUIDs } from '~/utils';
import { updateGoalProgress } from './progress';

export async function handleSubmit(
  {
    value,
    date,
    goalId,
    userId,
  }: { value: number; date: Date; goalId: string; userId: string },
  { callback, onError }: { callback?: () => void; onError?: () => void } = {},
) {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  try {
    await db.transaction().execute(async (tx) => {
      const sameDayEntry = await tx
        .selectFrom('entry')
        .selectAll()
        .where((eb) =>
          eb.and([
            eb('goalId', '=', goalId),
            eb('date', '>=', startOfDay.toISOString()),
            eb('date', '<=', endOfDay.toISOString()),
          ]),
        )
        .executeTakeFirst();

      if (sameDayEntry) {
        await tx
          .updateTable('entry')
          .set({ value, updatedAt: new Date().toISOString() })
          .where('id', '=', sameDayEntry.id)
          .execute();
      } else {
        const { uuid, shortUuid } = generateUUIDs();
        await tx
          .insertInto('entry')
          .values({
            id: uuid,
            shortId: shortUuid,
            goalId: goalId,
            value,
            date: date.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId,
          })
          .execute();
      }

      await updateGoalProgress(goalId, tx, date);
    });

    callback?.();
    return true;
  } catch (error) {
    console.error('err', error);
    onError?.();
    return false;
  }
}

export async function deleteEntry(
  id: string,
  goalId: string,
  { callback, onError }: { callback?: () => void; onError?: () => void } = {},
) {
  try {
    await db.transaction().execute(async (tx) => {
      await tx.deleteFrom('entry').where('id', '=', id).execute();
      await updateGoalProgress(goalId, tx);
    });
    callback?.();
  } catch (error) {
    console.error('Failed to delete entry:', error);
  }
}
