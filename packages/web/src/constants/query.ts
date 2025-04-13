import db from '~/lib/database';
import type { GoalFilter, GoalSort, GoalType } from '~/types/goal';

/* api */
export const AUTH_STATUS = {
  all: { queryKey: ['authStatus'] },
};

/* sqlite */
export const GOALS = {
  all: { queryKey: ['goal'] },
  list: (sort: GoalSort, filter: GoalFilter) => {
    const queryKey = ['goal', { sort }, { filter }];
    let query = db.selectFrom('goal').selectAll();

    if (filter === 'completed') {
      query = query
        .where((eb) => eb('currentValue', '>=', eb.ref('target')))
        .where('target', '>', 0);
    } else if (filter === 'incomplete') {
      query = query
        .where((eb) => eb('currentValue', '<', eb.ref('target')))
        .where('target', '>', 0);
    }

    query = query.orderBy(sort);

    return { queryKey, query };
  },
  detail: (goalId: string) => ({
    queryKey: ['goal', 'detail', { id: goalId, isShortId: false }],
    queryFn: () =>
      db
        .selectFrom('goal')
        .selectAll()
        .where('id', '=', goalId)
        .executeTakeFirstOrThrow(),
  }),
  detailShortId: (shortId: string) => ({
    queryKey: ['goal', 'detail', { id: shortId, isShortId: true }],
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
