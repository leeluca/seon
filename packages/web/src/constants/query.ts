import db from '~/lib/database';
import type { GoalSort, GoalType } from '~/types/goal';

/* api */
export const AUTH_STATUS = {
  all: { queryKey: ['authStatus'] },
};

/* sqlite */
export const GOALS = {
  all: { queryKey: ['goal'] },
  sorted: (sort: GoalSort) => ({
    queryKey: ['goal', { sort }],
    query: db.selectFrom('goal').selectAll().orderBy(sort),
  }),
  detail: (goalId: string) => ({
    queryKey: ['goal', { goalId }],
    queryFn: () =>
      db
        .selectFrom('goal')
        .selectAll()
        .where('id', '=', goalId)
        .executeTakeFirstOrThrow(),
  }),
  detailShortId: (shortId: string) => ({
    queryKey: ['goal', { shortId }],
    queryFn: () =>
      db
        .selectFrom('goal')
        .selectAll()
        .where('shortId', '=', shortId)
        .executeTakeFirstOrThrow(),
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
  entriesSum: (goalId: string, type: GoalType) => ({
    queryKey: ['entry', { goalId }, { type }, 'sum'],
    queryFn: () =>
      type === 'PROGRESS'
        ? db
            .selectFrom('entry')
            .select('value as totalValue')
            .where('goalId', '=', goalId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .executeTakeFirstOrThrow()
        : db
            .selectFrom('entry')
            .select(db.fn.sum('value').as('totalValue'))
            .where('goalId', '=', goalId)
            .executeTakeFirstOrThrow(),
  }),
};
