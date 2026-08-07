import { useMutation } from '@tanstack/react-query';

import {
  authCallbackUrl,
  authClient,
  type AuthClientError,
  toAuthClientError,
} from '~/lib/auth-client';

export interface SendVerificationEmailParams {
  email: string;
}

interface UseSendVerificationEmailProps {
  onSuccess?: (data: { sent: true }) => void;
  onError?: (error: AuthClientError) => void;
}

export function useSendVerificationEmail({
  onSuccess,
  onError,
}: UseSendVerificationEmailProps = {}) {
  return useMutation<
    { sent: true },
    AuthClientError,
    SendVerificationEmailParams
  >({
    mutationKey: ['auth', 'send-verification-email'],
    mutationFn: async ({ email }) => {
      let response: Awaited<
        ReturnType<typeof authClient.sendVerificationEmail>
      >;

      try {
        response = await authClient.sendVerificationEmail({
          email,
          callbackURL: authCallbackUrl('/verify-email'),
        });
      } catch (error) {
        throw toAuthClientError(error, 'Unable to send a verification email');
      }

      if (response.error || !response.data?.status) {
        throw toAuthClientError(
          response.error,
          'Unable to send a verification email',
        );
      }

      return { sent: true };
    },
    onSuccess,
    onError,
  });
}
