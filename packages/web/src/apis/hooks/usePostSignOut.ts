import { toast } from 'sonner';
import { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';

import { powerSyncDb } from '~/lib/database';
import { router } from '~/main';
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

const onSignOut = async () => {
  // TODO: manage key values as constants
  sessionStorage.removeItem('dbAccessToken');
  sessionStorage.removeItem('dbAccessTokenExp');
  localStorage.removeItem('sessionExp');
  await powerSyncDb.disconnectAndClear();
  toast.success('Successfuly signed out');
  await router.navigate({ to: '/' });
  return;
};

const usePostSignOut = ({ onSuccess, onError }: usePostSignOutProps = {}) => {
  const setUser = useUserAction();
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
          void mutate(AUTH_STATUS_KEY);
          setUser(undefined);
          void onSignOut();
        }
      },
      onError: (err) => {
        toast.error('Failed to sign out, please try again later.');
        onError && onError(err);
      },
    },
  );
};
export default usePostSignOut;
