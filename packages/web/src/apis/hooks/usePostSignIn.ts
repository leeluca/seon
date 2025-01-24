import { usePowerSync } from '@powersync/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import useSWRMutation from 'swr/mutation';
import { useShallow } from 'zustand/react/shallow';

import { AUTH_STATUS } from '~/constants/queryKeys';
import db from '~/lib/database';
import type { Database } from '~/lib/powersync/AppSchema';
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

interface updateLocalDataUserId {
  localUserId: string;
  newUserId: string;
  user: Database['user'];
  updateUserState: () => void;
  powerSync: ReturnType<typeof usePowerSync>;
}
// NOTE: This can also be achieved by using local-only tables
const updateLocalDataUserId = async ({
  localUserId,
  newUserId,
  user,
  updateUserState,
  powerSync,
}: updateLocalDataUserId) => {
  const [localGoals, localEntries] = await Promise.all([
    db.selectFrom('goal').selectAll().execute(),
    db.selectFrom('entry').selectAll().execute(),
  ]);

  // Update the userId of all local goals and entries to match the signed in user's
  const updatedGoals = localGoals.map((goal) => ({
    ...goal,
    userId: newUserId,
  }));
  const updatedEntries = localEntries.map((entry) => ({
    ...entry,
    userId: newUserId,
  }));

  // Delete all local entries and insert the signed in user (this will not be included in the upload queue)
  await db.transaction().execute(async (tx) => {
    await tx.executeQuery(db.deleteFrom('goal'));
    await tx.executeQuery(db.deleteFrom('entry'));
    await tx.executeQuery(db.deleteFrom('user').where('id', '=', localUserId));
    await tx.executeQuery(
      db.insertInto('user').values({
        ...user,
      }),
    );
  });
  // Clear the upload queue
  await powerSync.execute('DELETE FROM ps_crud');

  // Insert the updated goals and entries (these will be included in the upload queue)
  await db.transaction().execute(async (tx) => {
    if (updatedGoals.length) {
      await tx.executeQuery(db.insertInto('goal').values(updatedGoals));
    }
    if (updatedEntries.length) {
      await tx.executeQuery(db.insertInto('entry').values(updatedEntries));
    }
  });

  updateUserState();
};

// TODO: migrate to react-query
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
      onSuccess: async (data) => {
        data.result &&
          queryClient.invalidateQueries({
            queryKey: AUTH_STATUS.all.queryKey,
          });

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
          await updateLocalDataUserId({
            localUserId: localUserId,
            newUserId: data.user.id,
            user: {
              ...data.user,
              useSync: Number(data.user.useSync),
              preferences: JSON.stringify(data.user.preferences || {}),
            },
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
    },
  );
};
export default usePostSignIn;
