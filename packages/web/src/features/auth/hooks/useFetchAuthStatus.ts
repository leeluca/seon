import { useSyncExternalStore } from 'react';
import {
  onlineManager,
  queryOptions,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import { AUTH_STATUS } from '~/constants/query';
import { hasPendingSignOut } from '~/data/workspace/pendingSignOut';
import {
  authClient,
  AuthClientError,
  toAuthClientError,
} from '~/lib/auth-client';
import type { AuthAccountUser, AuthSessionStatus } from '~/types/user';

const AUTH_STALE_TIME = 5 * 60 * 1000;

export function createCheckingAuthStatus(
  browserOnline = true,
): AuthSessionStatus {
  return {
    state: 'checking',
    result: false,
    expiresAt: 0,
    browserOnline,
    user: null,
    lastCheckedAt: null,
  };
}

export function createUnauthenticatedAuthStatus(): AuthSessionStatus {
  return {
    state: 'unauthenticated',
    result: false,
    expiresAt: 0,
    browserOnline: true,
    user: null,
    lastCheckedAt: Date.now(),
  };
}

function toEpochSeconds(value: Date | string) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : 0;
}

export function createOfflineAuthStatus(
  lastKnownStatus: AuthSessionStatus,
  browserOnline: boolean,
): AuthSessionStatus {
  return {
    ...lastKnownStatus,
    state: 'offline',
    browserOnline,
  };
}

export async function readAuthStatus(): Promise<AuthSessionStatus> {
  // An offline sign-out immediately disables the local session/sync. The
  // HttpOnly server cookie is revoked by PendingSignOutProcessor when online.
  if (hasPendingSignOut()) return createUnauthenticatedAuthStatus();

  let response: Awaited<ReturnType<typeof authClient.getSession>>;

  try {
    response = await authClient.getSession();
  } catch (error) {
    throw toAuthClientError(error, 'Unable to reach the authentication server');
  }

  if (response.error) {
    if (response.error.status === 401) {
      return createUnauthenticatedAuthStatus();
    }

    throw toAuthClientError(
      response.error,
      'Unable to check the current session',
    );
  }

  if (!response.data) {
    return createUnauthenticatedAuthStatus();
  }

  return {
    state: 'authenticated',
    result: true,
    expiresAt: toEpochSeconds(response.data.session.expiresAt),
    browserOnline: true,
    user: response.data.user as AuthAccountUser,
    lastCheckedAt: Date.now(),
  };
}

function getAuthStatusQueryOptions() {
  return queryOptions({
    queryKey: AUTH_STATUS.all.queryKey,
    queryFn: readAuthStatus,
    initialData: createCheckingAuthStatus(),
    initialDataUpdatedAt: 0,
    staleTime: AUTH_STALE_TIME,
    gcTime: Number.POSITIVE_INFINITY,
    networkMode: 'online',
    retry: (failureCount, error) =>
      error instanceof AuthClientError &&
      (error.status === 0 || error.status >= 500) &&
      failureCount < 2,
  });
}

function subscribeToOnlineStatus(onStoreChange: () => void) {
  return onlineManager.subscribe(onStoreChange);
}

function getOnlineSnapshot() {
  return onlineManager.isOnline();
}

export function useFetchAuthStatus() {
  const browserOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineSnapshot,
    () => true,
  );
  const queryResult = useQuery(getAuthStatusQueryOptions());
  const isAuthUnavailable = !browserOnline || queryResult.error !== null;
  const data = isAuthUnavailable
    ? createOfflineAuthStatus(queryResult.data, browserOnline)
    : queryResult.data;

  return {
    ...queryResult,
    data,
    authState: data.state,
  };
}

export function fetchAuthStatus(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    queryKey: AUTH_STATUS.all.queryKey,
    queryFn: readAuthStatus,
    staleTime: AUTH_STALE_TIME,
  });
}
