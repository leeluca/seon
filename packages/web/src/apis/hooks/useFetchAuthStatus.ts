import { useEffect } from 'react';
import {
  queryOptions,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import { AUTH_STATUS } from '~/constants/query';
import { SESSION_EXP_KEY } from '~/constants/storage';
import { useUserStore } from '~/states/stores/userStore';
import type { AuthStatus, User } from '~/types/user';
import { APIError } from '~/utils/errors';
import fetcher from '../fetcher';

const AUTH_STATUS_API = '/api/auth/status';

// TODO: Consider if saving to localStorage is really necessary
function getInitialData(sessionExpKeyPrefix: string): AuthStatus {
  const sessionExp = localStorage.getItem(sessionExpKeyPrefix);
  return {
    result: !!sessionExp && Number(sessionExp) > Math.floor(Date.now() / 1000),
    expiresAt: Number(sessionExp) || 0,
  };
}

export function getAuthStatusQueryOptions(user: User) {
  const SESSION_EXP_KEY_PREFIX = `${SESSION_EXP_KEY}_${user.shortId}`;

  return queryOptions({
    queryKey: AUTH_STATUS.all.queryKey,
    queryFn: () => fetcher<AuthStatus>(AUTH_STATUS_API),
    enabled: !!user?.useSync,
    placeholderData: getInitialData(SESSION_EXP_KEY_PREFIX),
    gcTime: Number.POSITIVE_INFINITY,
    retry: (failureCount, error) => {
      // retry once on 401 to absorb transient races
      return error instanceof APIError && error.status === 401
        ? failureCount < 1
        : failureCount < 3;
    },
  });
}

export function useFetchAuthStatus() {
  const user = useUserStore((state) => state.user);
  const SESSION_EXP_KEY_PREFIX = `${SESSION_EXP_KEY}_${user.shortId}`;

  const queryResult = useQuery(getAuthStatusQueryOptions(user));

  const { data, error } = queryResult;

  useEffect(() => {
    if (data?.result) {
      localStorage.setItem(
        SESSION_EXP_KEY_PREFIX,
        JSON.stringify(data.expiresAt),
      );
    }

    if (error instanceof APIError && error.status === 401) {
      localStorage.removeItem(SESSION_EXP_KEY_PREFIX);
    }
  }, [error, data, SESSION_EXP_KEY_PREFIX]);

  return queryResult;
}

export function fetchAuthStatus(queryClient: QueryClient, user: User) {
  return queryClient.ensureQueryData(getAuthStatusQueryOptions(user));
}
