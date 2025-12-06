import type { LOCALES } from '~/constants/locales';
import type { Database } from '~/data/db/AppSchema';
import type { GoalFilter, GoalSort } from '~/features/goal/model';

export interface Preferences {
  language?: keyof typeof LOCALES;
  defaultGoalSort?: GoalSort;
  defaultGoalFilter?: GoalFilter;
}

export type User = Database['user'];

export interface AuthStatus {
  result: boolean;
  expiresAt: number;
}
