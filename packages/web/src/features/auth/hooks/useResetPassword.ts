import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AUTH_STATUS } from '~/constants/query';
import { powerSyncDb } from '~/data/db/database';
import {
  authClient,
  type AuthClientError,
  toAuthClientError,
} from '~/lib/auth-client';
import { notifyAuthSessionChanged } from '../authChangeNotification';
import { createUnauthenticatedAuthStatus } from './useFetchAuthStatus';

export interface ResetPasswordParams {
  token: string;
  newPassword: string;
}

interface UseResetPasswordProps {
  onSuccess?: (data: { reset: true }) => void;
  onError?: (error: AuthClientError) => void;
}

export function useResetPassword({
  onSuccess,
  onError,
}: UseResetPasswordProps = {}) {
  const queryClient = useQueryClient();

  return useMutation<{ reset: true }, AuthClientError, ResetPasswordParams>({
    mutationKey: ['auth', 'reset-password'],
    mutationFn: async ({ token, newPassword }) => {
      let response: Awaited<ReturnType<typeof authClient.resetPassword>>;

      try {
        response = await authClient.resetPassword({ token, newPassword });
      } catch (error) {
        throw toAuthClientError(error, 'Unable to reset the password');
      }

      if (response.error || !response.data?.status) {
        throw toAuthClientError(response.error, 'Unable to reset the password');
      }

      return { reset: true };
    },
    onSuccess: async (data) => {
      await queryClient.cancelQueries({
        queryKey: AUTH_STATUS.all.queryKey,
      });
      queryClient.setQueryData(
        AUTH_STATUS.all.queryKey,
        createUnauthenticatedAuthStatus(),
      );

      const [disconnectResult, signOutResult] = await Promise.allSettled([
        powerSyncDb.disconnect(),
        authClient.signOut(),
      ]);
      if (disconnectResult.status === 'rejected') {
        console.error(
          'Could not disconnect sync after resetting the password',
          disconnectResult.reason,
        );
      }
      if (signOutResult.status === 'rejected') {
        console.error(
          'Could not clear the local session after resetting the password',
          signOutResult.reason,
        );
      } else if (
        signOutResult.value.error &&
        signOutResult.value.error.status !== 401
      ) {
        console.error(
          'Could not clear the local session after resetting the password',
          signOutResult.value.error,
        );
      }

      notifyAuthSessionChanged('password-reset');
      onSuccess?.(data);
    },
    onError,
  });
}
