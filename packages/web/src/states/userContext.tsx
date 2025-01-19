import React, { useMemo, useState } from 'react';

import useAuthStatus from '~/apis/hooks/useAuthStatus';
import type { LOCALES } from '~/constants/locales';
import { AUTH_CONTEXT_INITIAL_STATE } from '~/constants/state';
import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
import type { APIError } from '~/utils/errors';
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
  isSignInVerified: boolean;
  expiresAt: number;
  isLoading: boolean;
  isError: boolean;
  error?: APIError;
}

const AuthContext = React.createContext<IAuthContext>(
  AUTH_CONTEXT_INITIAL_STATE,
);

export const useAuthContext = () => React.useContext(AuthContext);

const existingUser = await db.selectFrom('user').selectAll().executeTakeFirst();

// TODO: refactor, suspend while fetching user so that user is always defined
const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<IUserContext | undefined>(existingUser);
  const { data: authStatus, isLoading, isError, error } = useAuthStatus(user);
  // TODO: add default preferences object on user creation
  // FIXME: needs to update automatically
  const [preferences, setPreferences] = useState<IPreferences | undefined>(
    parseUserPreferences(existingUser?.preferences),
  );

  const authData = useMemo(
    () => ({
      isSignedIn: authStatus.result,
      isSignInVerified: authStatus.result && !isLoading && !isError,
      expiresAt: authStatus.expiresAt,
      isLoading,
      isError,
      error,
    }),
    [authStatus, isLoading, isError, error],
  );

  const preferencesValue = useMemo(
    () => ({ preferences, setPreferences }),
    [preferences],
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
