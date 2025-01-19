import { create } from 'zustand';

import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
import { generateOfflineUser } from '~/utils';

type User = Database['user'];

interface UserState {
  user: User;
  isInitialized: boolean;
  setUser: (user: User) => void;
  fetch: () => Promise<void>;
  setIsInitialized: (isInitialized: boolean) => void;
}

function getUserFromDb() {
  return db.selectFrom('user').selectAll().executeTakeFirst();
}
const prefetchedUser = await getUserFromDb();

export const useUserStore = create<UserState>()((set, get) => ({
  user: prefetchedUser || generateOfflineUser(),
  isInitialized: !!prefetchedUser,
  // userPreferences

  fetch: async () => {
    const user = await getUserFromDb();
    if (user) {
      set({ isInitialized: true });
      set({ user });
    }
  },
  setUser: (user: User) => set({ user }),
  setIsInitialized: (isInitialized: boolean) => set({ isInitialized }),
}));
