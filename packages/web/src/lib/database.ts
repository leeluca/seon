import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { PowerSyncDatabase } from '@powersync/web';

import { AppSchema, Database } from '~/lib/powersync/AppSchema';


// NOTE: should be accessed through PowerSyncContext
export const powerSyncDb = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'goal-dashboard.db',
  },
});

const db = wrapPowerSyncWithKysely<Database>(powerSyncDb);

export default db;
