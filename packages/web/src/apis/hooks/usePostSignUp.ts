import { toast } from 'sonner';
import { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';

import { APIError } from '~/utils/errors';
import { AUTH_STATUS_KEY } from './useAuthStatus';
import fetcher from '../fetcher';

export const POST_SIGNIN_KEY = `/api/auth/signup`;

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  uuid: string;
}
export interface PostSignUpResponse {
  result: boolean;
  expiresAt: number;
  user: { name: string; email: string; id: string; shortId: string };
}
interface usePostSignUpProps {
  onSuccess?: (data: PostSignUpResponse) => void;
  onError?: (error: APIError) => void;
}

const usePostSignUp = ({ onSuccess, onError }: usePostSignUpProps = {}) => {
  return useSWRMutation<
    PostSignUpResponse,
    APIError,
    typeof POST_SIGNIN_KEY,
    SignUpParams
  >(
    POST_SIGNIN_KEY,
    (url: string, { arg }: { arg: SignUpParams }) =>
      fetcher<PostSignUpResponse>(url, {
        method: 'POST',
        body: JSON.stringify(arg),
      }),
    {
      onSuccess: (data) => {
        if (data.result) {
          void mutate(AUTH_STATUS_KEY);
        }
        onSuccess && onSuccess(data);
      },
      onError: (err) => {
        toast.error('Failed to sign up, please try again later.');
        onError && onError(err);
      },
    },
  );
};
export default usePostSignUp;
