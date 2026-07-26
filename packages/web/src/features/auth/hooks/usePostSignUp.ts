import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AUTH_STATUS } from '~/constants/query';
import {
  flushPendingSignOut,
  hasPendingSignOut,
} from '~/data/workspace/pendingSignOut';
import {
  authCallbackUrl,
  authClient,
  AuthClientError,
  type BetterAuthUser,
  toAuthClientError,
} from '~/lib/auth-client';

export const POST_SIGNUP_KEY = 'sign-up/email';

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
}

export interface PostSignUpResponse {
  result: true;
  requiresEmailVerification: true;
  user: BetterAuthUser;
}

interface UsePostSignUpProps {
  onSuccess?: (data: PostSignUpResponse) => void;
  onError?: (error: AuthClientError) => void;
}

const usePostSignUp = ({ onSuccess, onError }: UsePostSignUpProps = {}) => {
  const queryClient = useQueryClient();

  return useMutation<PostSignUpResponse, AuthClientError, SignUpParams>({
    mutationKey: [POST_SIGNUP_KEY],
    mutationFn: async (payload) => {
      if (hasPendingSignOut() && !(await flushPendingSignOut())) {
        throw new AuthClientError({
          message: 'Unable to finish the previous sign out',
        });
      }

      let response: Awaited<ReturnType<typeof authClient.signUp.email>>;

      try {
        response = await authClient.signUp.email({
          ...payload,
          callbackURL: authCallbackUrl('/verify-email'),
        });
      } catch (error) {
        throw toAuthClientError(error, 'Unable to create the account');
      }

      if (response.error || !response.data) {
        throw toAuthClientError(response.error, 'Unable to create the account');
      }

      return {
        result: true,
        requiresEmailVerification: true,
        user: response.data.user,
      };
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: AUTH_STATUS.all.queryKey,
      });
      onSuccess?.(data);
    },
    onError: (error) => {
      toast.error('Failed to sign up, please try again later.');
      onError?.(error);
    },
  });
};

export default usePostSignUp;
