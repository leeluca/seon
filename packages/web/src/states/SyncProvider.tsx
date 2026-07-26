import { useMemo, type ReactNode } from 'react';
import { PowerSyncContext } from '@powersync/react';

import { usePowerSyncConnector } from '~/hooks/usePowerSyncConnector';
import { SyncEngineContext } from './syncContext';

export function SyncProvider({ children }: { children: ReactNode }) {
  const { connector, powerSync, syncEnabled, accountMatchesWorkspace } =
    usePowerSyncConnector();

  const connectorValue = useMemo(
    () => ({
      connector,
      powerSync,
      syncEnabled,
      accountMatchesWorkspace,
    }),
    [connector, powerSync, syncEnabled, accountMatchesWorkspace],
  );

  return (
    <PowerSyncContext.Provider value={powerSync}>
      <SyncEngineContext.Provider value={connectorValue}>
        {children}
      </SyncEngineContext.Provider>
    </PowerSyncContext.Provider>
  );
}
