import * as Sentry from '@sentry/react';
import { create } from 'zustand';

import db, { activeWorkspace } from '~/data/db/database';
import { isLocalDbAvailable } from '~/data/db/storage';
import type { Preferences, User } from '~/types/user';
import { generateOfflineUser, profileToUser } from '~/utils';
import { parseUserPreferences } from '~/utils/validation';

type UserState = {
  user: User;
  isInitialized: boolean;
  userPreferences: Preferences;
};
type UserActions = {
  setUser: (user: User) => void;
  fetch: () => Promise<void>;
  setIsInitialized: (isInitialized: boolean) => void;
  setPreferences: (preferences: string | null) => void;
};

async function getUserFromDb(): Promise<User | undefined> {
  try {
    if (!(await isLocalDbAvailable())) {
      return undefined;
    }

    const profile = await db
      .selectFrom('profile')
      .selectAll()
      .executeTakeFirst();
    return profile
      ? profileToUser(profile, activeWorkspace.kind === 'account')
      : undefined;
  } catch (error) {
    Sentry.captureException(error, {
      extra: { message: 'Failed to fetch profile from database' },
      tags: { storage_error: 'fetch_profile' },
    });

    console.error('Failed to fetch profile from database', error);
    return undefined;
  }
}

const prefetchedUser = await getUserFromDb();
const initialUser = prefetchedUser || generateOfflineUser(activeWorkspace.id);

export const useUserStore = create<UserState & UserActions>()((set, get) => ({
  user: initialUser,
  isInitialized: !!prefetchedUser,
  userPreferences: parseUserPreferences(initialUser?.preferences),
  setUser: (user: User) => set({ user }),
  setIsInitialized: (isInitialized: boolean) => set({ isInitialized }),
  setPreferences: (preferences: string | null) => {
    set({ userPreferences: parseUserPreferences(preferences) });
    set({ user: { ...get().user, preferences } });
  },
  fetch: async () => {
    const user = await getUserFromDb();
    if (user) {
      get().setIsInitialized(true);
      get().setUser(user);
      get().setPreferences(user.preferences);
    }
  },
}));
