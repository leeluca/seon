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
    dbFilename: 'example.db',
  },
});

const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector] = React.useState(new SupabaseConnector());
  const [powerSync] = React.useState(db);

  React.useEffect(() => {
    // Linting thinks this is a hook due to it's name
    Logger.useDefaults(); // eslint-disable-line
    Logger.setLevel(Logger.DEBUG);
    // For console testing purposes
    (window as any)._powersync = powerSync;

    powerSync.init();
    const l = connector.registerListener({
      initialized: () => {},
      sessionStarted: () => {
        powerSync.connect(connector);
      },
    });

    connector.init();

    return () => l?.();
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
