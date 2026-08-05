import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signOutLocally } from '~/data/domain/authRepo';
import {
  flushPendingSignOut,
  markPendingSignOut,
  notifyAuthChange,
} from '~/features/auth/authSession';
import { useUserStore } from '~/states/stores/userStore';
import { useSupabase } from '~/states/syncContext';
import type { APIError } from '~/utils/errors';

export const POST_SIGNOUT_KEY = '/api/auth/signout';

interface PostSignOutResponse {
  result: true;
  revocationPending: boolean;
}

interface UsePostSignOutProps {
  onSuccess?: (data: PostSignOutResponse) => void;
  onError?: (error: APIError) => void;
}

const usePostSignOut = ({ onSuccess, onError }: UsePostSignOutProps = {}) => {
  const userId = useUserStore((state) => state.user.id);
  const { resetConnector } = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<PostSignOutResponse, APIError, void>({
    mutationKey: [POST_SIGNOUT_KEY],
    mutationFn: async () => {
      markPendingSignOut(userId);
      notifyAuthChange('signed-out', userId);
      await signOutLocally({ resetConnector, queryClient });
      const revoked = await flushPendingSignOut();
      return { result: true, revocationPending: !revoked };
    },
    onSuccess,
    onError,
  });
};

export default usePostSignOut;
