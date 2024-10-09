import { toast } from 'sonner';
import { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';

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

const usePostSignOut = ({ onSuccess, onError }: usePostSignOutProps = {}) => {
  return useSWRMutation<PostSignOutResponse, APIError, typeof POST_SIGNOUT_KEY>(
    POST_SIGNOUT_KEY,
    (url: string) =>
      fetcher<PostSignOutResponse>(url, {
        method: 'POST',
      }),
    {
      onSuccess: (data) => {
        if (data.result) {
          void mutate(AUTH_STATUS_KEY);
        }
        // TODO: delete local content and redirect to home page (not implemented)
        onSuccess && onSuccess(data);
      },
      onError: (err) => {
        toast.error('Failed to sign out, please try again later.');
        onError && onError(err);
      },
    },
  );
};
export default usePostSignOut;
