import type { LOCALES } from '~/constants/locales';
import type { Database } from '~/lib/powersync/AppSchema';
import type { GoalFilter, GoalSort } from './goal';

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
