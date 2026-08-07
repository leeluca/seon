import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AUTH_STATUS } from '~/constants/query';
import {
  authClient,
  type AuthClientError,
  toAuthClientError,
} from '~/lib/auth-client';
import { notifyAuthSessionChanged } from '../authChangeNotification';
import { createUnauthenticatedAuthStatus } from './useFetchAuthStatus';

export const POST_SIGNOUT_KEY = 'sign-out';

export interface PostSignOutResponse {
  result: true;
}

interface UsePostSignOutProps {
  onSuccess?: (data: PostSignOutResponse) => void;
  onError?: (error: AuthClientError) => void;
}

const usePostSignOut = ({ onSuccess, onError }: UsePostSignOutProps = {}) => {
  const queryClient = useQueryClient();

  return useMutation<PostSignOutResponse, AuthClientError, void>({
    mutationKey: [POST_SIGNOUT_KEY],
    mutationFn: async () => {
      let response: Awaited<ReturnType<typeof authClient.signOut>>;

      try {
        response = await authClient.signOut();
      } catch (error) {
        throw toAuthClientError(error, 'Unable to sign out');
      }

      if (response.error || !response.data?.success) {
        throw toAuthClientError(response.error, 'Unable to sign out');
      }

      return { result: true };
    },
    onSuccess: (data) => {
      notifyAuthSessionChanged();
      queryClient.setQueryData(
        AUTH_STATUS.all.queryKey,
        createUnauthenticatedAuthStatus(),
      );
      onSuccess?.(data);
    },
    onError,
  });
};

export default usePostSignOut;
