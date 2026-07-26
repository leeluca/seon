import { useMutation } from '@tanstack/react-query';

import {
  authClient,
  type AuthClientError,
  toAuthClientError,
} from '~/lib/auth-client';

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
    onSuccess,
    onError,
  });
}
