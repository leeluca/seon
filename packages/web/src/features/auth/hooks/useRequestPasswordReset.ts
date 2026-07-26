import { useMutation } from '@tanstack/react-query';

import {
  authCallbackUrl,
  authClient,
  type AuthClientError,
  toAuthClientError,
} from '~/lib/auth-client';

export interface RequestPasswordResetParams {
  email: string;
}

interface UseRequestPasswordResetProps {
  onSuccess?: (data: { sent: true }) => void;
  onError?: (error: AuthClientError) => void;
}

export function useRequestPasswordReset({
  onSuccess,
  onError,
}: UseRequestPasswordResetProps = {}) {
  return useMutation<
    { sent: true },
    AuthClientError,
    RequestPasswordResetParams
  >({
    mutationKey: ['auth', 'request-password-reset'],
    mutationFn: async ({ email }) => {
      let response: Awaited<ReturnType<typeof authClient.requestPasswordReset>>;

      try {
        response = await authClient.requestPasswordReset({
          email,
          redirectTo: authCallbackUrl('/reset-password'),
        });
      } catch (error) {
        throw toAuthClientError(error, 'Unable to request a password reset');
      }

      if (response.error || !response.data?.status) {
        throw toAuthClientError(
          response.error,
          'Unable to request a password reset',
        );
      }

      return { sent: true };
    },
    onSuccess,
    onError,
  });
}
