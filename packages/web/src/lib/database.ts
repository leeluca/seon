import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import {
  PowerSyncDatabase,
  WASQLiteOpenFactory,
  WASQLiteVFS,
} from '@powersync/web';

import { AppSchema, type Database } from '~/lib/powersync/AppSchema';

// NOTE: should be accessed through PowerSyncContext
export const powerSyncDb = new PowerSyncDatabase({
  schema: AppSchema,
  database: new WASQLiteOpenFactory({
    dbFilename: 'seon-goals.db',
    vfs: WASQLiteVFS.OPFSCoopSyncVFS,
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
