import type { LOCALES } from '~/constants/locales';
import type { Database } from '~/data/db/AppSchema';
import type { GoalFilter, GoalSort } from '~/features/goal/model';

export interface Preferences {
  language?: keyof typeof LOCALES;
  defaultGoalSort?: GoalSort;
  defaultGoalFilter?: GoalFilter;
}

export type Profile = Database['profile'];

/**
 * Compatibility view used by existing account/status UI. `shortId` and
 * `useSync` are derived runtime state and are not stored in the profile table.
 */
export type User = Profile & {
  shortId: string;
  useSync: number;
};

export interface AuthStatus {
  result: boolean;
  expiresAt: number;
}

export type AuthenticationState =
  | 'checking'
  | 'authenticated'
  | 'unauthenticated'
  | 'offline';

export interface AuthAccountUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSessionStatus extends AuthStatus {
  state: AuthenticationState;
  browserOnline: boolean;
  user: AuthAccountUser | null;
  lastCheckedAt: number | null;
}
