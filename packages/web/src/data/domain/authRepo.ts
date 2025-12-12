import { t } from '@lingui/core/macro';
import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AUTH_STATUS } from '~/constants/query';
import {
  DB_TOKEN_EXP_KEY,
  DB_TOKEN_KEY,
  SESSION_EXP_KEY,
} from '~/constants/storage';
import db, { powerSyncDb } from '~/data/db/database';
import type { Database } from '~/data/db/AppSchema';

type PowerSyncExecutor = {
  execute: (sql: string) => Promise<unknown>;
};

interface SyncLocalUserDataParams {
  localUserId: string;
  newUserId: string;
  user: Database['user'];
  updateUserState: () => void;
  powerSync: PowerSyncExecutor;
}

// NOTE: This can also be achieved by using local-only tables
export const syncLocalUserDataAfterSignIn = async ({
  localUserId,
  newUserId,
  user,
  updateUserState,
  powerSync,
}: SyncLocalUserDataParams) => {
  const [localGoals, localEntries] = await Promise.all([
    db.selectFrom('goal').selectAll().execute(),
    db.selectFrom('entry').selectAll().execute(),
  ]);

  // NOTE: Update the userId of all local goals and entries to match the signed in user's
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

  updateUserState();
};

interface SignOutParams {
  resetConnector: () => void;
  resetLocalUser: () => void;
  queryClient: QueryClient;
}

export const signOutLocally = async ({
  resetConnector,
  resetLocalUser,
  queryClient,
}: SignOutParams) => {
  const signOutToast = toast(t`Signing you out...`, {
    dismissible: false,
    duration: Number.POSITIVE_INFINITY,
  });

  sessionStorage.removeItem(DB_TOKEN_KEY);
  sessionStorage.removeItem(DB_TOKEN_EXP_KEY);
  localStorage.removeItem(SESSION_EXP_KEY);

  await powerSyncDb.disconnectAndClear();
  resetConnector();

  resetLocalUser();
  toast.dismiss(signOutToast);
  toast.success(t`See you again!`);

  await queryClient.invalidateQueries({
    queryKey: AUTH_STATUS.all.queryKey,
  });

  location.reload();
};
