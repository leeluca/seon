import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import {
  PowerSyncDatabase,
  WASQLiteOpenFactory,
  WASQLiteVFS,
} from '@powersync/web';

import { AppSchema, type Database } from '~/data/db/AppSchema';
import { isOpfsAvailable, type StorageBackend } from './storage';

export const DB_NAME = 'seon-goals.db';

const opfsSupported = await isOpfsAvailable();

export const storageBackend: StorageBackend = opfsSupported
  ? 'opfs'
  : 'indexeddb';

// NOTE: should be accessed through PowerSyncContext
export const powerSyncDb = new PowerSyncDatabase({
  schema: AppSchema,
  database: new WASQLiteOpenFactory({
    dbFilename: DB_NAME,
    vfs: opfsSupported
      ? WASQLiteVFS.OPFSCoopSyncVFS
      : WASQLiteVFS.IDBBatchAtomicVFS,
    flags: {
      enableMultiTabs: typeof SharedWorker !== 'undefined',
    },
  }),
  flags: {
    enableMultiTabs: typeof SharedWorker !== 'undefined',
  },
});

const db = wrapPowerSyncWithKysely<Database>(powerSyncDb);

export default db;
