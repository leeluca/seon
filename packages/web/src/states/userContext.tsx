import React, { useMemo, useState } from 'react';

import useAuthStatus from '~/apis/hooks/useAuthStatus';
import { LOCALES } from '~/constants/locales';
import db from '~/lib/database';
import { Database } from '~/lib/powersync/AppSchema';
import { APIError } from '~/utils/errors';
import { parseUserPreferences } from '~/utils/validation';

interface IUserContext
  extends Omit<Database['user'], 'updatedAt' | 'createdAt'> {
  updatedAt?: string;
  createdAt?: string;
}
export interface IPreferences {
  language?: keyof typeof LOCALES;
}

interface PreferencesContextValue {
  preferences: IPreferences | undefined;
  setPreferences: React.Dispatch<
    React.SetStateAction<IPreferences | undefined>
  >;
}
const PreferencesContext = React.createContext<
  PreferencesContextValue | undefined
>(undefined);

export const usePreferences = () => {
  const context = React.useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a UserProvider');
  }
  return context;
};

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

// TODO: refactor, suspend while fetching user so that user is always defined
const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<IUserContext | undefined>(existingUser);
  const { data: authStatus, isLoading, isError, error } = useAuthStatus(user);
  // TODO: add default preferences object on user creation
  const [preferences, setPreferences] = useState<IPreferences | undefined>(
    parseUserPreferences(existingUser?.preferences),
  );

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

  const preferencesValue = useMemo(
    () => ({ preferences, setPreferences }),
    [preferences, setPreferences],
  );

  return (
    <UserContext.Provider value={user}>
      <UserActionContext.Provider value={setUser}>
        <PreferencesContext.Provider value={preferencesValue}>
          <AuthContext.Provider value={authData}>
            {children}
          </AuthContext.Provider>
        </PreferencesContext.Provider>
      </UserActionContext.Provider>
    </UserContext.Provider>
  );
};

export default UserProvider;
