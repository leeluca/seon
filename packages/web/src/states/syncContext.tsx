import React, { useMemo } from 'react';
import { PowerSyncContext } from '@powersync/react';

import { usePowerSyncConnector } from '~/hooks/usePowerSyncConnector';
import { SupabaseConnector } from '~/lib/powersync/SupabaseConnector';

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
  const { connector, powerSync, resetConnector } = usePowerSyncConnector();

  const connectorValue = useMemo(
    () => ({
      connector,
      resetConnector,
    }),
    [connector, resetConnector],
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
