import { useMutation, useQueryClient } from '@tanstack/react-query';

import fetcher from '~/apis/fetcher';
import { signOutLocally } from '~/data/domain/authRepo';
import { useUserStore } from '~/states/stores/userStore';
import { useSupabase } from '~/states/syncContext';
import type { APIError } from '~/utils/errors';

export const POST_SIGNOUT_KEY = '/api/auth/signout';

interface PostSignOutResponse {
  result: boolean;
}
interface usePostSignOutProps {
  onSuccess?: (data: PostSignOutResponse) => void;
  onError?: (error: APIError) => void;
}

// FIXME: should work offline
const usePostSignOut = ({ onSuccess, onError }: usePostSignOutProps = {}) => {
  const setUserIsInitialized = useUserStore((state) => state.setIsInitialized);
  const { resetConnector } = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<PostSignOutResponse, APIError, void>({
    mutationKey: [POST_SIGNOUT_KEY],
    mutationFn: () =>
      fetcher<PostSignOutResponse>(POST_SIGNOUT_KEY, {
        method: 'POST',
      }),
    onSuccess: async (data) => {
      if (data.result) {
        onSuccess?.(data);
        await signOutLocally({
          resetConnector,
          resetLocalUser: () => setUserIsInitialized(false),
          queryClient,
        });
      }
    },
    onError: async (err) => {
      onError?.(err);
      await signOutLocally({
        resetConnector,
        resetLocalUser: () => setUserIsInitialized(false),
        queryClient,
      });
    },
  });
};
export default usePostSignOut;
