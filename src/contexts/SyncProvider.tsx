import React, { Suspense } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/web';
import Logger from 'js-logger';

import { AppSchema } from '~/lib/powersync/AppSchema';
import { SupabaseConnector } from '~/lib/powersync/SupabaseConnector';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'goal-dashboard.db',
  },
});

const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector] = React.useState(new SupabaseConnector());
  const [powerSync] = React.useState(db);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    Logger.useDefaults();
    Logger.setLevel(Logger.DEBUG);
    // FIXME: for console testing purposes, to be removed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (window as any)._powersync = powerSync;

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
  }, [powerSync, connector]);

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
