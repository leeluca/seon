import type { CompilableQuery } from '@powersync/common';
import { sql } from '@powersync/kysely-driver';

import type { Database } from '~/data/db/AppSchema';
import db from '~/data/db/database';
import type {
  GoalFilter,
  GoalSort,
  GoalSortDirection,
  GoalSortField,
  GoalType,
} from '~/features/goal/model';

type GoalRow = Database['goal'];
type GoalListQueryKey = ['goal', { sort: GoalSort }, { filter: GoalFilter }];
type GoalDetailQueryKey = [
  'goal',
  'detail',
  { id: string; isShortId: boolean },
];

type GoalListQuery = {
  queryKey: GoalListQueryKey;
  query: CompilableQuery<GoalRow>;
};

type GoalDetailQuery = {
  queryKey: GoalDetailQueryKey;
  queryFn: () => Promise<GoalRow>;
};

type GoalQueries = {
  all: { queryKey: ['goal'] };
  list: (sort: GoalSort, filter: GoalFilter) => GoalListQuery;
  detail: (goalId: string) => GoalDetailQuery;
  detailShortId: (shortId: string) => GoalDetailQuery;
};

/* api */
export const AUTH_STATUS = {
  all: { queryKey: ['authStatus'] },
};

/* sqlite */
export const GOALS: GoalQueries = {
  all: { queryKey: ['goal'] as ['goal'] },
  list: (sort: GoalSort, filter: GoalFilter) => {
    const queryKey: GoalListQueryKey = ['goal', { sort }, { filter }];
    let query = db.selectFrom('goal').selectAll();

    if (filter === 'archived') {
      query = query.where((eb) => eb('archivedAt', 'is not', eb.val(null)));
    } else {
      query = query.where((eb) => eb('archivedAt', 'is', eb.val(null)));

      if (filter === 'completed') {
        query = query
          .where((eb) => eb('currentValue', '>=', eb.ref('target')))
          .where('target', '>', 0);
      } else if (filter === 'ongoing') {
        query = query
          .where((eb) => eb('currentValue', '<', eb.ref('target')))
          .where('target', '>', 0);
      }
    }

    const [sortField, sortDirection] = sort.split(' ') as [
      GoalSortField,
      GoalSortDirection,
    ];

    if (sortField === 'title') {
      query = query.orderBy(
        sql`${sql.ref(sortField)} COLLATE NOCASE`,
        sortDirection,
      );
    } else {
      query = query.orderBy(sortField, sortDirection);
    }

    return { queryKey, query };
  },
  detail: (goalId: string) => {
    const queryKey: GoalDetailQueryKey = [
      'goal',
      'detail',
      { id: goalId, isShortId: false },
    ];

    return {
      queryKey,
      queryFn: () =>
        db
          .selectFrom('goal')
          .selectAll()
          .where('id', '=', goalId)
          .executeTakeFirstOrThrow(),
    };
  },
  detailShortId: (shortId: string) => {
    const queryKey: GoalDetailQueryKey = [
      'goal',
      'detail',
      { id: shortId, isShortId: true },
    ];

    return {
      queryKey,
      queryFn: () =>
        db
          .selectFrom('goal')
          .selectAll()
          .where('shortId', '=', shortId)
          .executeTakeFirstOrThrow(),
    };
  },
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
