import type { Database } from '~/lib/powersync/AppSchema';

export type GoalType = 'COUNT' | 'PROGRESS' | 'BOOLEAN';

export type GoalSortField = 'createdAt' | 'targetDate' | 'title';
export type GoalSortDirection = 'asc' | 'desc';

export type GoalSort = `${GoalSortField} ${GoalSortDirection}`;

export type GoalFilter = 'all' | 'completed' | 'ongoing';

export type GoalEditableFields = Pick<
  Database['goal'],
  | 'title'
  | 'target'
  | 'unit'
  | 'startDate'
  | 'targetDate'
  | 'initialValue'
  | 'type'
>;
