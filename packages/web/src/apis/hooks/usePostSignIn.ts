import { toast } from 'sonner';
import { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';

import { APIError } from '~/utils/errors';
import { AUTH_STATUS_KEY } from './useAuthStatus';
import fetcher from '../fetcher';

export const POST_SIGNIN_KEY = `/api/auth/signin`;

export interface SignInParams {
  email: string;
  password: string;
}
interface PostSignInResponse {
  result: boolean;
  expiresAt: number;
}
interface usePostSignInProps {
  onSuccess?: (data: PostSignInResponse) => void;
  onError?: (error: APIError) => void;
}

const usePostSignIn = ({ onSuccess, onError }: usePostSignInProps = {}) => {
  return useSWRMutation<
    PostSignInResponse,
    APIError,
    typeof POST_SIGNIN_KEY,
    SignInParams
  >(
    POST_SIGNIN_KEY,
    (url: string, { arg }: { arg: SignInParams }) =>
      fetcher<PostSignInResponse>(url, {
        method: 'POST',
        body: JSON.stringify(arg),
      }),
    {
      onSuccess: (data) => {
        data.result && void mutate(AUTH_STATUS_KEY);
        onSuccess && onSuccess(data);
      },
      onError: (err) => {
        toast.error('Failed to sign in, please try again later.');
        onError && onError(err);
      },
    },
  );
};
export default usePostSignIn;
