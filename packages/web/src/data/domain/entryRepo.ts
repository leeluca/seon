import type { Database } from '~/data/db/AppSchema';
import db from '~/data/db/database';
import { updateGoalProgress } from '~/data/domain/progress';
import { generateUUIDs } from '~/utils';

export async function recordEntry({
  value,
  date,
  goalId,
  userId,
}: {
  value: number;
  date: Date;
  goalId: string;
  userId: string;
}) {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

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
          goalId,
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
}

export async function deleteEntry(id: string, goalId: string) {
  await db.transaction().execute(async (tx) => {
    await tx.deleteFrom('entry').where('id', '=', id).execute();
    await updateGoalProgress(goalId, tx);
  });
}

export function getPreviousEntry(
  entries: Database['entry'][],
  selectedDate: Date,
) {
  return entries
    .filter((entry) => new Date(entry.date) < selectedDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}
