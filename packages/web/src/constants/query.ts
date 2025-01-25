import db from '~/lib/database';
import type { GoalSort } from '~/types/goal';

/* api */
export const AUTH_STATUS = {
  all: { queryKey: ['authStatus'] },
};

/* sqlite */
export const GOALS = {
  all: { queryKey: ['goal'] },
  sorted: (sort: GoalSort) => ({
    queryKey: ['goal', { sort }],
    queryFn: () => db.selectFrom('goal').selectAll().orderBy(sort).execute(),
  }),
  detail: (goalId: string) => ({
    queryKey: ['goal', { goalId }],
    queryFn: () =>
      db
        .selectFrom('goal')
        .selectAll()
        .where('id', '=', goalId)
        .executeTakeFirst(),
  }),
  detailShortId: (shortId: string) => ({
    queryKey: ['goal', { shortId }],
    queryFn: () =>
      db
        .selectFrom('goal')
        .selectAll()
        .where('shortId', '=', shortId)
        .executeTakeFirst(),
  }),
};

export const ENTRIES = {
  all: { queryKey: ['entry'] },
  goalId: (goalId: string) => ({
    queryKey: ['entry', { goalId }],
    queryFn: () =>
      db
        .selectFrom('entry')
        .selectAll()
        .where('goalId', '=', goalId)
        .orderBy('date', 'asc')
        .execute(),
  }),
};
