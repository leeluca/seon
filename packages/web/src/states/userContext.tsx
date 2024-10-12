import React, { useState } from 'react';

import db from '~/lib/database';
import { Database } from '~/lib/powersync/AppSchema';

const UserContext = React.createContext<Database['user'] | undefined>(
  undefined,
);
export const useUser = () => React.useContext(UserContext);

const UserActionContext = React.createContext<
  React.Dispatch<React.SetStateAction<Database['user'] | undefined>> | undefined
>(undefined);

export const useUserAction = () => {
  const context = React.useContext(UserActionContext);
  if (!context) {
    throw new Error('useUserAction must be used within a UserProvider');
  }
  return context;
};

const existingUser = await db.selectFrom('user').selectAll().executeTakeFirst();

const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Database['user'] | undefined>(existingUser);

  // useEffect(() => {
  //   async function initUser() {
  //     // query on home route and setUser
  //     let existingUser = await db
  //       .selectFrom('user')
  //       .selectAll()
  //       .executeTakeFirst();

  //     if (!existingUser) {
  //       // generate on click
  //       const newUser = generateOfflineUser();
  //       existingUser = await db
  //         .insertInto('user')
  //         .values(newUser)
  //         .returningAll()
  //         .executeTakeFirstOrThrow();
  //     }

  //     setUser(existingUser);
  //   }

  //   // TODO: error handling
  //   void initUser();
  // }, []);

  return (
    <UserContext.Provider value={user}>
      <UserActionContext.Provider value={setUser}>
        {children}
      </UserActionContext.Provider>
    </UserContext.Provider>
  );
};

export default UserProvider;
