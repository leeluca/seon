import { usePowerSync } from '@powersync/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { AUTH_STATUS } from '~/constants/query';
import type { Database } from '~/data/db/AppSchema';
import { syncLocalUserDataAfterSignIn } from '~/services/auth';
import { useUserStore } from '~/states/stores/userStore';
import type { Preferences } from '~/types/user';
import type { APIError } from '~/utils/errors';
import fetcher from '../fetcher';

export const POST_SIGNIN_KEY = '/api/auth/signin';

export interface SignInParams {
  email: string;
  password: string;
}
export interface PostSignInResponse {
  result: boolean;
  expiresAt: number;
  user: {
    name: string;
    email: string;
    id: string;
    shortId: string;
    useSync: true;
    createdAt: string;
    updatedAt: string;
    preferences?: Preferences;
  };
}

interface usePostSignInProps {
  onSuccess?: (data: PostSignInResponse) => void;
  onError?: (error: APIError) => void;
}
const usePostSignIn = ({ onSuccess, onError }: usePostSignInProps = {}) => {
  const [localUserId, setUser, setIsUserInitialized, setPreferences] =
    useUserStore(
      useShallow((state) => [
        state.user.id,
        state.setUser,
        state.setIsInitialized,
        state.setPreferences,
      ]),
    );
  const powerSync = usePowerSync();
  const queryClient = useQueryClient();

  return useMutation<PostSignInResponse, APIError, SignInParams>({
    mutationKey: [POST_SIGNIN_KEY],
    mutationFn: (credentials) =>
      fetcher<PostSignInResponse>(POST_SIGNIN_KEY, {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: async (data) => {
      if (data.result) {
        await queryClient.invalidateQueries({
          queryKey: AUTH_STATUS.all.queryKey,
        });
      }

      const updateUserState = () => {
        const stringifiedPreferences = JSON.stringify(data.user.preferences);
        setUser({
          ...data.user,
          useSync: Number(data.user.useSync),
          preferences: stringifiedPreferences,
        });
        setPreferences(stringifiedPreferences);
        setIsUserInitialized(true);
      };

      if (localUserId !== data.user.id) {
        const databaseUser: Database['user'] = {
          ...data.user,
          useSync: Number(data.user.useSync),
          preferences: JSON.stringify(data.user.preferences || {}),
        };
        await syncLocalUserDataAfterSignIn({
          localUserId,
          newUserId: data.user.id,
          user: databaseUser,
          updateUserState,
          powerSync,
        });
      } else {
        updateUserState();
      }

      onSuccess?.(data);
    },
    onError: (err) => {
      if (err.status !== 401) {
        toast.error('Failed to sign in, please try again later.');
      }
      onError?.(err);
    },
  });
};
export default usePostSignIn;
