import type { LOCALES } from '~/constants/locales';
import type { Database } from '~/lib/powersync/AppSchema';
import type { GoalSort } from './goal';

export interface Preferences {
  language?: keyof typeof LOCALES;
  defaultGoalSort?: GoalSort;
}

export type User = Database['user'];

export interface AuthStatus {
  result: boolean;
  expiresAt: number;
}
