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

export const POST_SIGNIN_KEY = 'sign-in/email';

export interface SignInParams {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface PostSignInResponse {
  result: true;
  user: BetterAuthUser;
}

interface UsePostSignInProps {
  onSuccess?: (data: PostSignInResponse) => void;
  onError?: (error: AuthClientError) => void;
}

const usePostSignIn = ({ onSuccess, onError }: UsePostSignInProps = {}) => {
  const queryClient = useQueryClient();

  return useMutation<PostSignInResponse, AuthClientError, SignInParams>({
    mutationKey: [POST_SIGNIN_KEY],
    mutationFn: async ({ email, password, rememberMe = true }) => {
      if (hasPendingSignOut() && !(await flushPendingSignOut())) {
        throw new AuthClientError({
          message: 'Unable to finish the previous sign out',
        });
      }

      let response: Awaited<ReturnType<typeof authClient.signIn.email>>;

      try {
        response = await authClient.signIn.email({
          email,
          password,
          rememberMe,
          callbackURL: authCallbackUrl('/verify-email'),
        });
      } catch (error) {
        throw toAuthClientError(error, 'Unable to sign in');
      }

      if (response.error || !response.data) {
        throw toAuthClientError(response.error, 'Unable to sign in');
      }

      // Better Auth also returns a token for non-cookie clients. The browser
      // deliberately ignores it and relies exclusively on the HttpOnly cookie.
      return { result: true, user: response.data.user };
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: AUTH_STATUS.all.queryKey,
      });
      onSuccess?.(data);
    },
    onError: (error) => {
      if (error.status !== 401 && error.status !== 403) {
        toast.error('Failed to sign in, please try again later.');
      }
      onError?.(error);
    },
  });
};

export default usePostSignIn;
