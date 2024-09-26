import React, { useEffect, useState } from 'react';

import db from '~/lib/database';
import { Database } from '~/lib/powersync/AppSchema';
import { generateOfflineUser } from '~/utils';

const UserContext = React.createContext<Database['user'] | null>(null);
export const useUser = () => React.useContext(UserContext);

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

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export default UserProvider;
