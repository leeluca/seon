import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import useSWRMutation from 'swr/mutation';

import { AUTH_STATUS } from '~/constants/query';
import type { APIError } from '~/utils/errors';
import fetcher from '../fetcher';

export const POST_SIGNIN_KEY = '/api/auth/signup';

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  uuid: string;
}
export interface PostSignUpResponse {
  result: boolean;
  expiresAt: number;
  user: {
    name: string;
    email: string;
    id: string;
    shortId: string;
    useSync: true;
  };
}
interface usePostSignUpProps {
  onSuccess?: (data: PostSignUpResponse) => void;
  onError?: (error: APIError) => void;
}

// TODO: migrate to react-query
const usePostSignUp = ({ onSuccess, onError }: usePostSignUpProps = {}) => {
  const queryClient = useQueryClient();
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
          void queryClient.invalidateQueries({
            queryKey: AUTH_STATUS.all.queryKey,
          });
        }
        onSuccess?.(data);
      },
      onError: (err) => {
        toast.error('Failed to sign up, please try again later.');
        onError?.(err);
      },
    },
  );
};
export default usePostSignUp;
