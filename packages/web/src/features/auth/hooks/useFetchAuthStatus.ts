import { useEffect } from 'react';
import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import fetcher from '~/apis/fetcher';
import { AUTH_STATUS } from '~/constants/query';
import {
  getPendingSignOut,
  subscribeToAuthChanges,
} from '~/features/auth/authSession';
import { useUserStore } from '~/states/stores/userStore';
import type { AuthStatus, User } from '~/types/user';
import { APIError } from '~/utils/errors';

const AUTH_STATUS_API = '/api/auth/status';

export const createUnauthenticatedAuthStatus = (): AuthStatus => ({
  result: false,
  expiresAt: 0,
  userId: null,
});

export function getAuthStatusQueryOptions(user: User) {
  const pendingSignOut = getPendingSignOut();

  return queryOptions({
    queryKey: AUTH_STATUS.all.queryKey,
    queryFn: async () => {
      if (getPendingSignOut()) return createUnauthenticatedAuthStatus();

      const status = await fetcher<AuthStatus>(AUTH_STATUS_API);
      if (status.userId !== user.id) {
        throw new APIError({
          message: 'The signed-in account does not own this local data',
          status: 409,
          statusText: 'Conflict',
          code: 'LOCAL_ACCOUNT_CONFLICT',
        });
      }
      return status;
    },
    enabled: Boolean(user.useSync) && !pendingSignOut,
    initialData: createUnauthenticatedAuthStatus,
    gcTime: Number.POSITIVE_INFINITY,
    retry: (failureCount, error) =>
      error instanceof APIError &&
      (error.status === 401 || error.status === 409)
        ? false
        : failureCount < 3,
  });
}

export function useFetchAuthStatus() {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();
  const queryResult = useQuery(getAuthStatusQueryOptions(user));

  useEffect(
    () =>
      subscribeToAuthChanges((change) => {
        if (change.state === 'signed-out') {
          queryClient.setQueryData(
            AUTH_STATUS.all.queryKey,
            createUnauthenticatedAuthStatus(),
          );
          return;
        }

        void queryClient.invalidateQueries({
          queryKey: AUTH_STATUS.all.queryKey,
        });
      }),
    [queryClient],
  );

  return queryResult;
}

export function fetchAuthStatus(queryClient: QueryClient, user: User) {
  return queryClient.ensureQueryData(getAuthStatusQueryOptions(user));
}
