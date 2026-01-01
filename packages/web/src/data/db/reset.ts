import * as Sentry from '@sentry/react';

import { DB_NAME, powerSyncDb, storageBackend } from '~/data/db/database';
import { purgeIndexedDbStorage, purgeOpfsStorage } from '~/data/db/storage';

export async function resetLocalDatabase(): Promise<void> {
  try {
    await powerSyncDb.disconnect();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { storage_error: 'reset_db_disconnect' },
    });
  }

  try {
    await powerSyncDb.close();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { storage_error: 'reset_db_close' },
    });
  }

  try {
    if (storageBackend === 'opfs') {
      await purgeOpfsStorage();
    } else {
      await purgeIndexedDbStorage(DB_NAME);
    }
  } catch (error) {
    console.error('Failed to purge local database storage', error);
    Sentry.captureException(error, {
      tags: { storage_error: 'reset_db_purge_failed' },
      extra: { storageBackend, dbFilename: DB_NAME },
    });
  }
}
