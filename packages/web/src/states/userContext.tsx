import React, { useMemo, useState } from 'react';

import useAuthStatus from '~/apis/hooks/useAuthStatus';
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

export interface AuthContextType {
  isSignedIn: boolean;
  expiresAt: number;
  isLoading: boolean;
}
export const authContextInitialState = {
  isSignedIn: false,
  expiresAt: 0,
  isLoading: false,
};
const AuthContext = React.createContext<AuthContextType>(
  authContextInitialState,
);

export const useAuthContext = () => React.useContext(AuthContext);

const existingUser = await db.selectFrom('user').selectAll().executeTakeFirst();

const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Database['user'] | undefined>(existingUser);
  const { data: authStatus, isLoading } = useAuthStatus(user);
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
  const authData = useMemo(
    () => ({
      isSignedIn: authStatus.isSignedIn,
      expiresAt: authStatus.expiresAt,
      isLoading,
    }),
    [authStatus, isLoading],
  );
  return (
    <UserContext.Provider value={user}>
      <UserActionContext.Provider value={setUser}>
        <AuthContext.Provider value={authData}>{children}</AuthContext.Provider>
      </UserActionContext.Provider>
    </UserContext.Provider>
  );
};

export default UserProvider;
