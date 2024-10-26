import { usePowerSync } from '@powersync/react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';

import db from '~/lib/database';
import { Database } from '~/lib/powersync/AppSchema';
import { useUser, useUserAction } from '~/states/userContext';
import { APIError } from '~/utils/errors';
import { AUTH_STATUS_KEY } from './useAuthStatus';
import fetcher from '../fetcher';

export const POST_SIGNIN_KEY = `/api/auth/signin`;

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

  await db.transaction().execute(async (tx) => {
    if (updatedGoals.length) {
      await tx.executeQuery(db.insertInto('goal').values(updatedGoals));
    }
    if (updatedEntries.length) {
      await tx.executeQuery(db.insertInto('entry').values(updatedEntries));
    }
  });

  // Insert the updated goals and entries (these will be included in the upload queue)
  updateUserState();
};

interface usePostSignInProps {
  onSuccess?: (data: PostSignInResponse) => void;
  onError?: (error: APIError) => void;
}
const usePostSignIn = ({ onSuccess, onError }: usePostSignInProps = {}) => {
  const setUser = useUserAction();
  const localUser = useUser();
  const powerSync = usePowerSync();

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

        const updateUserState = () =>
          setUser({
            ...data.user,
            useSync: Number(data.user.useSync),
          });

        if (localUser && localUser?.id !== data.user.id) {
          void updateLocalDataUserId({
            localUserId: localUser.id,
            newUserId: data.user.id,
            user: {
              ...data.user,
              useSync: Number(data.user.useSync),
            },
            updateUserState,
            powerSync,
          });
        } else {
          updateUserState();
        }

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
