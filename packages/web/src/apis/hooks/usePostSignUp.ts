import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AUTH_STATUS } from '~/constants/query';
import type { APIError } from '~/utils/errors';
import fetcher from '../fetcher';

export const POST_SIGNUP_KEY = '/api/auth/signup';

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

const usePostSignUp = ({ onSuccess, onError }: usePostSignUpProps = {}) => {
  const queryClient = useQueryClient();
  return useMutation<PostSignUpResponse, APIError, SignUpParams>({
    mutationKey: [POST_SIGNUP_KEY],
    mutationFn: (payload) =>
      fetcher<PostSignUpResponse>(POST_SIGNUP_KEY, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: async (data) => {
      if (data.result) {
        await queryClient.invalidateQueries({
          queryKey: AUTH_STATUS.all.queryKey,
        });
      }
      onSuccess?.(data);
    },
    onError: (err) => {
      toast.error('Failed to sign up, please try again later.');
      onError?.(err);
    },
  });
};
export default usePostSignUp;
