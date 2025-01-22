import { t } from '@lingui/core/macro';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import useSWRMutation from 'swr/mutation';

import { AUTH_STATUS_QUERY_KEY } from '~/constants/query';
import {
  DB_TOKEN_EXP_KEY,
  DB_TOKEN_KEY,
  SESSION_EXP_KEY,
} from '~/constants/storage';
import { powerSyncDb } from '~/lib/database';
import { router } from '~/main';
import { useUserStore } from '~/states/stores/userStore';
import { useSupabase } from '~/states/syncContext';
import type { APIError } from '~/utils/errors';
import fetcher from '../fetcher';

export const POST_SIGNOUT_KEY = '/api/auth/signout';

interface PostSignOutResponse {
  result: boolean;
}
interface usePostSignOutProps {
  onSuccess?: (data: PostSignOutResponse) => void;
  onError?: (error: APIError) => void;
}

const onSignOut = async (
  resetConnector: () => void,
  resetLocalUser: () => void,
  queryClient: QueryClient,
) => {
  const signOutToast = toast('Signing you out...', {
    dismissible: false,
    duration: Number.POSITIVE_INFINITY,
  });

  sessionStorage.removeItem(DB_TOKEN_KEY);
  sessionStorage.removeItem(DB_TOKEN_EXP_KEY);
  localStorage.removeItem(SESSION_EXP_KEY);

  await powerSyncDb.disconnectAndClear();
  resetConnector();

  resetLocalUser();
  toast.dismiss(signOutToast);
  toast.success(t`See you again!`);

  await queryClient.invalidateQueries({
    queryKey: AUTH_STATUS_QUERY_KEY,
  });

  await router.navigate({ to: '/' });

  return;
};

// TODO: migrate to react-query
const usePostSignOut = ({ onSuccess, onError }: usePostSignOutProps = {}) => {
  const setUserIsInitialized = useUserStore((state) => state.setIsInitialized);
  const { resetConnector } = useSupabase();
  const queryClient = useQueryClient();

  return useSWRMutation<PostSignOutResponse, APIError, typeof POST_SIGNOUT_KEY>(
    POST_SIGNOUT_KEY,
    (url: string) =>
      fetcher<PostSignOutResponse>(url, {
        method: 'POST',
      }),
    {
      onSuccess: (data) => {
        if (data.result) {
          onSuccess?.(data);
          void onSignOut(
            resetConnector,
            () => setUserIsInitialized(false),
            queryClient,
          );
        }
      },
      onError: (err) => {
        onError?.(err);
        void onSignOut(
          resetConnector,
          () => setUserIsInitialized(false),
          queryClient,
        );
      },
    },
  );
};
export default usePostSignOut;
