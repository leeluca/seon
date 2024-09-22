import React, { Suspense, useEffect, useState } from 'react';
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/web';
import Logger from 'js-logger';

import { AppSchema, Database } from '~/lib/powersync/AppSchema';
import { SupabaseConnector } from '~/lib/powersync/SupabaseConnector';
import { generateOfflineUser } from '~/utils';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

const powerSyncDb = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'goal-dashboard.db',
  },
});

export const db = wrapPowerSyncWithKysely<Database>(powerSyncDb);

const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector] = useState(new SupabaseConnector());
  const [powerSync] = useState(powerSyncDb);
  const [useSync, setUseSync] = useState(false);

  useEffect(() => {
    async function initUser() {
      let existingUser = await db
        .selectFrom('user')
        .selectAll()
        .executeTakeFirst();

      if (!existingUser) {
        const newUser = generateOfflineUser();
        existingUser = await db
          .insertInto('user')
          .values(newUser)
          .returningAll()
          .executeTakeFirstOrThrow();
      }

      setUseSync(Boolean(existingUser.useSync));
    }

    // TODO: error handling
    void initUser();
  }, []);
  useEffect(() => {
    if (!useSync) return;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    Logger.useDefaults();
    Logger.setLevel(Logger.DEBUG);
    // FIXME: for console testing purposes, to be removed
    window._powersync = powerSync;

    const initializePowerSync = async () => {
      await powerSync.init();
    };
    const initializeConnector = async () => {
      await connector.init();
    };

    void initializePowerSync();

    const listener = connector.registerListener({
      initialized: () => {},
      sessionStarted: () => {
        void powerSync.connect(connector);
      },
    });
    void initializeConnector();

    return () => listener();
  }, [powerSync, connector, useSync]);

  return (
    <Suspense fallback={<div>Loading</div>}>
      <PowerSyncContext.Provider value={powerSync}>
        <SupabaseContext.Provider value={connector}>
          {children}
        </SupabaseContext.Provider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SyncProvider;
