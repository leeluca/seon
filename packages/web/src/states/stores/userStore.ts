import { create } from 'zustand';

import db from '~/lib/database';
import type { Preferences, User } from '~/types/user';
import { generateOfflineUser } from '~/utils';
import { isOpfsAvailable } from '~/utils/storage';
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

async function getUserFromDb() {
  try {
    if (!(await isOpfsAvailable())) {
      return undefined;
    }

    return await db.selectFrom('user').selectAll().executeTakeFirst();
  } catch (error) {
    console.error('Failed to fetch user from database', error);
    return undefined;
  }
}

const prefetchedUser = await getUserFromDb();

export const useUserStore = create<UserState & UserActions>()((set, get) => ({
  user: prefetchedUser || generateOfflineUser(),
  isInitialized: !!prefetchedUser,
  userPreferences: parseUserPreferences(prefetchedUser?.preferences),
  setUser: (user: User) => set({ user }),
  setIsInitialized: (isInitialized: boolean) => set({ isInitialized }),
  setPreferences: (preferences: string | null) =>
    set({ userPreferences: parseUserPreferences(preferences) }),
  fetch: async () => {
    const user = await getUserFromDb();
    if (user) {
      get().setIsInitialized(true);
      get().setUser(user);
      get().setPreferences(user.preferences);
    }
  },
}));
