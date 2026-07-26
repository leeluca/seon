import { createContext, useContext } from 'react';
import type { PowerSyncDatabase } from '@powersync/web';

import type { PowerSyncConnector } from '~/data/sync/PowerSyncConnector';

interface SyncEngineContextValue {
  connector: PowerSyncConnector;
  powerSync: PowerSyncDatabase;
  syncEnabled: boolean;
  accountMatchesWorkspace: boolean;
}

export const SyncEngineContext = createContext<
  SyncEngineContextValue | undefined
>(undefined);

export const useSyncEngine = () => {
  const context = useContext(SyncEngineContext);
  if (!context) {
    throw new Error('useSyncEngine must be used within SyncProvider');
  }
  return context;
};
