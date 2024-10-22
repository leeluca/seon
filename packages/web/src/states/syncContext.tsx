import React, { useEffect, useState } from 'react';
import { PowerSyncContext } from '@powersync/react';
import Logger from 'js-logger';

import { powerSyncDb } from '~/lib/database';
import { SupabaseConnector } from '~/lib/powersync/SupabaseConnector';
import { useAuthContext, useUser } from './userContext';

interface SupabaseConnectorContext {
  connector: SupabaseConnector;
  resetConnector: () => void;
}
const SupabaseContext = React.createContext<
  SupabaseConnectorContext | undefined
>(undefined);
export const useSupabase = () => {
  const context = React.useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector, setConnector] = useState(new SupabaseConnector());
  const [powerSync] = useState(powerSyncDb);

  const user = useUser();
  const { isSignedIn } = useAuthContext();

  useEffect(() => {
    if (!user?.useSync || !isSignedIn) return;

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
  }, [powerSync, connector, user, isSignedIn]);

  const connectorValue = React.useMemo(
    () => ({
      connector,
      resetConnector: () => {
        setConnector(new SupabaseConnector());
      },
    }),
    [connector],
  );

  return (
    <PowerSyncContext.Provider value={powerSync}>
      <SupabaseContext.Provider value={connectorValue}>
        {children}
      </SupabaseContext.Provider>
    </PowerSyncContext.Provider>
  );
};

export default SyncProvider;
