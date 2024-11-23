import { toast } from 'sonner';
import { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';

import {
  DB_TOKEN_EXP_KEY,
  DB_TOKEN_KEY,
  SESSION_EXP_KEY,
} from '~/constants/storage';
import { powerSyncDb } from '~/lib/database';
import { router } from '~/main';
import { useSupabase } from '~/states/syncContext';
import { useUserAction } from '~/states/userContext';
import { APIError } from '~/utils/errors';
import { AUTH_STATUS_KEY } from './useAuthStatus';
import fetcher from '../fetcher';

export const POST_SIGNOUT_KEY = `/api/auth/signout`;

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
) => {
  const signOutToast = toast('Signing you out...', {
    dismissible: false,
    duration: Infinity,
  });

  sessionStorage.removeItem(DB_TOKEN_KEY);
  sessionStorage.removeItem(DB_TOKEN_EXP_KEY);
  localStorage.removeItem(SESSION_EXP_KEY);

  await powerSyncDb.disconnectAndClear();
  resetConnector();

  resetLocalUser();
  toast.dismiss(signOutToast);
  toast.success('See you again!');

  await mutate(AUTH_STATUS_KEY);
  await router.navigate({ to: '/' });

  return;
};

const usePostSignOut = ({ onSuccess, onError }: usePostSignOutProps = {}) => {
  const setUser = useUserAction();
  const { resetConnector } = useSupabase();

  return useSWRMutation<PostSignOutResponse, APIError, typeof POST_SIGNOUT_KEY>(
    POST_SIGNOUT_KEY,
    (url: string) =>
      fetcher<PostSignOutResponse>(url, {
        method: 'POST',
      }),
    {
      onSuccess: (data) => {
        if (data.result) {
          onSuccess && onSuccess(data);
          void onSignOut(resetConnector, () => setUser(undefined));
        }
      },
      onError: (err) => {
        onError && onError(err);
        void onSignOut(resetConnector, () => setUser(undefined));
      },
    },
  );
};
export default usePostSignOut;
