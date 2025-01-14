import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { PowerSyncDatabase } from '@powersync/web';

import { AppSchema, type Database } from '~/lib/powersync/AppSchema';

// NOTE: should be accessed through PowerSyncContext
export const powerSyncDb = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'seon-goals.db',
  },
});

const db = wrapPowerSyncWithKysely<Database>(powerSyncDb);

export default db;
