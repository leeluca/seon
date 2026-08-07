import { useEffect, useMemo, type ReactNode } from 'react';
import { PowerSyncContext, useStatus } from '@powersync/react';

import { usePowerSyncConnector } from '~/hooks/usePowerSyncConnector';
import { useUserStore } from '~/states/stores/userStore';
import { SyncEngineContext } from './syncContext';

function SyncedProfileRefresh({ syncEnabled }: { syncEnabled: boolean }) {
  const { hasSynced, lastSyncedAt } = useStatus();
  const refreshProfile = useUserStore((state) => state.fetch);

  useEffect(() => {
    if (syncEnabled && hasSynced && lastSyncedAt) void refreshProfile();
  }, [hasSynced, lastSyncedAt, refreshProfile, syncEnabled]);

  return null;
}

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
      <SyncedProfileRefresh syncEnabled={syncEnabled} />
      <SyncEngineContext.Provider value={connectorValue}>
        {children}
      </SyncEngineContext.Provider>
    </PowerSyncContext.Provider>
  );
}
