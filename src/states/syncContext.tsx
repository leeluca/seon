import React, { useEffect, useState } from 'react';
import { PowerSyncContext } from '@powersync/react';
import Logger from 'js-logger';

import db, { powerSyncDb } from '~/lib/database';
import { SupabaseConnector } from '~/lib/powersync/SupabaseConnector';
import { generateOfflineUser } from '~/utils';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

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
    // || !isLoggedIn?
    if (!useSync) return;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    Logger.useDefaults();
    Logger.setLevel(Logger.DEBUG);
    // FIXME: for console testing purposes, to be removed
    window._powersync = powerSync;

    const initializePowerSync = async () => {
      await powerSync.init();
    };
    const initializeConnector = () => {
      connector.init();
    };

    void initializePowerSync();

    const listener = connector.registerListener({
      initialized: () => {
        void powerSync.connect(connector);
      },
      sessionStarted: () => {},
    });
    initializeConnector();

    return () => listener();
  }, [powerSync, connector, useSync]);

  return (
    <PowerSyncContext.Provider value={powerSync}>
      <SupabaseContext.Provider value={connector}>
        {children}
      </SupabaseContext.Provider>
    </PowerSyncContext.Provider>
  );
};

export default SyncProvider;
