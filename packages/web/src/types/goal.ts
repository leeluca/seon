export type GoalType = 'COUNT' | 'PROGRESS' | 'BOOLEAN';

export type GoalSort =
  | 'createdAt desc'
  | 'createdAt asc'
  | 'targetDate desc'
  | 'targetDate asc'
  | 'title asc'
  | 'title desc';

export type GoalFilter = 'all' | 'completed' | 'incomplete';
