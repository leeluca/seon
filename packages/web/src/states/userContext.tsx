import React, { useMemo, useState } from 'react';

import useAuthStatus from '~/apis/hooks/useAuthStatus';
import db from '~/lib/database';
import { Database } from '~/lib/powersync/AppSchema';
import { APIError } from '~/utils/errors';

interface IUserContext
  extends Omit<Database['user'], 'updatedAt' | 'createdAt'> {
  updatedAt?: string;
  createdAt?: string;
}

const UserContext = React.createContext<IUserContext | undefined>(undefined);
export const useUser = () => React.useContext(UserContext);

const UserActionContext = React.createContext<
  React.Dispatch<React.SetStateAction<IUserContext | undefined>> | undefined
>(undefined);

export const useUserAction = () => {
  const context = React.useContext(UserActionContext);
  if (!context) {
    throw new Error('useUserAction must be used within a UserProvider');
  }
  return context;
};

export interface IAuthContext {
  isSignedIn: boolean;
  expiresAt: number;
  isLoading: boolean;
  isError: boolean;
  error?: APIError;
}
export const authContextInitialState = {
  isSignedIn: false,
  expiresAt: 0,
  isLoading: false,
  isError: false,
  error: undefined,
};
const AuthContext = React.createContext<IAuthContext>(authContextInitialState);

export const useAuthContext = () => React.useContext(AuthContext);

const existingUser = await db.selectFrom('user').selectAll().executeTakeFirst();

const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<IUserContext | undefined>(existingUser);
  const { data: authStatus, isLoading, isError, error } = useAuthStatus(user);

  const authData = useMemo(
    () => ({
      isSignedIn: authStatus.result,
      expiresAt: authStatus.expiresAt,
      isLoading,
      isError,
      error,
    }),
    [authStatus, isLoading, isError, error],
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
