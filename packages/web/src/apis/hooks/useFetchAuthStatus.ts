import { useEffect } from 'react';
import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { AUTH_STATUS } from '~/constants/query';
import { SESSION_EXP_KEY } from '~/constants/storage';
import { useUserStore } from '~/states/stores/userStore';
import type { AuthStatus, User } from '~/types/user';
import { APIError } from '~/utils/errors';
import { isDemo } from '~/utils/demo';
import fetcher from '../fetcher';

const AUTH_STATUS_API = '/api/auth/status';

// TODO: Consider if saving to localStorage is really necessary
function getInitialData(): AuthStatus {
  const sessionExp = localStorage.getItem(SESSION_EXP_KEY);
  return {
    result: !!sessionExp && Number(sessionExp) > Math.floor(Date.now() / 1000),
    expiresAt: Number(sessionExp) || 0,
  };
}

export function getAuthStatusQueryOptions(user: User) {
  return queryOptions({
    queryKey: AUTH_STATUS.all.queryKey,
    queryFn: () => fetcher<AuthStatus>(AUTH_STATUS_API),
    enabled: !!user?.useSync,
    initialData: getInitialData(),
    gcTime: Number.POSITIVE_INFINITY,
  });
}

export function useFetchAuthStatus() {
  const user = useUserStore((state) => state.user);

  // Skip the auth status query entirely in demo mode
  const queryResult = useQuery({
    ...getAuthStatusQueryOptions(user),
    enabled: !isDemo() && !!user?.useSync,
  });

  const { data, error } = queryResult;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (data) {
      localStorage.setItem(SESSION_EXP_KEY, JSON.stringify(data.expiresAt));
    }

    if (error instanceof APIError && error.status === 401) {
      localStorage.removeItem(SESSION_EXP_KEY);
      queryClient.setQueryData(AUTH_STATUS.all.queryKey, {
        result: false,
        expiresAt: 0,
      });
    }
  }, [error, data, queryClient]);

  // In demo mode, return a fixed result
  if (isDemo()) {
    return {
      data: {
        result: true,
        expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      },
      isLoading: false,
      error: null,
    };
  }

  return queryResult;
}

export function fetchAuthStatus(queryClient: QueryClient, user: User) {
  if (isDemo()) {
    // In demo mode, just return a fixed result
    return Promise.resolve({
      result: true,
      expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    });
  }
  return queryClient.ensureQueryData(getAuthStatusQueryOptions(user));
}
