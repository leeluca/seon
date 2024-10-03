import React, { useEffect, useState } from 'react';

import db from '~/lib/database';
import { Database } from '~/lib/powersync/AppSchema';
import { generateOfflineUser } from '~/utils';

const UserContext = React.createContext<Database['user'] | null>(null);
export const useUser = () => React.useContext(UserContext);

const UserActionContext = React.createContext<React.Dispatch<
  React.SetStateAction<Database['user'] | null>
> | null>(null);

export const useUserAction = () => {
  const context = React.useContext(UserActionContext);
  if (!context) {
    throw new Error('useUserAction must be used within a UserProvider');
  }
  return context;
};

const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Database['user'] | null>(null);

  useEffect(() => {
    async function initUser() {
      let existingUser = await db
        .selectFrom('user')
        .selectAll()
        .executeTakeFirst();

      if (!existingUser) {
        const newUser = generateOfflineUser();
        existingUser = await db
          .insertInto('user')
          .values(newUser)
          .returningAll()
          .executeTakeFirstOrThrow();
      }

      setUser(existingUser);
    }

    // TODO: error handling
    void initUser();
  }, []);

  return (
    <UserContext.Provider value={user}>
      <UserActionContext.Provider value={setUser}>
        {children}
      </UserActionContext.Provider>
    </UserContext.Provider>
  );
};

export default UserProvider;
