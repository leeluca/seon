import { useMemo, type ReactNode } from 'react';
import { PowerSyncContext } from '@powersync/react';

import { usePowerSyncConnector } from '~/hooks/usePowerSyncConnector';
import { SupabaseContext } from './syncContext';

export function SyncProvider({ children }: { children: ReactNode }) {
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
}
