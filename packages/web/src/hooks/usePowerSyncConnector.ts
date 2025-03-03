import { useCallback, useEffect, useMemo, useState } from 'react';
import Logger from 'js-logger';
import { PowerSyncFetchImpl } from '@powersync/web';
import { PowerSyncBackendConnector } from '@powersync/web';
import { isDemo } from '~/utils/demo';
import { useUserStore } from '~/states/stores/userStore';
import { getDbAccessToken } from '~/apis/credential';

import { useFetchAuthStatus } from '~/apis/hooks/useFetchAuthStatus';
import { powerSyncDb } from '~/lib/database';
import { SupabaseConnector } from '~/lib/powersync/SupabaseConnector';

// Add this dummy connector for demo mode
class DemoSyncConnector {
  connected = false;
  status = 'disconnected';
  
  connect() {
    console.log('Demo mode: sync connection disabled');
    return Promise.resolve();
  }
  
  disconnect() {
    return Promise.resolve();
  }
}

export function usePowerSyncConnector() {
  const { data, isLoading } = useFetchAuthStatus();
  const user = useUserStore(state => state.user);

  const isSignInVerified = data?.result && !isLoading;

  const [connector, setConnector] = useState<PowerSyncBackendConnector | null>(null);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [powerSync] = useState(powerSyncDb);

  // In demo mode, return a dummy connector that doesn't try to connect
  if (isDemo()) {
    return {
      connector: new DemoSyncConnector(),
      status: 'disconnected',
      error: null,
      resetConnector: () => {},
    };
  }

  const resetConnector = useCallback(() => {
    setConnector(null);
    setStatus('disconnected');
    setError(null);
  }, []);

  useEffect(() => {
    if (!user?.useSync) return;
    
    const createConnector = async () => {
      try {
        // Token fetch function
        const getToken = async () => {
          return getDbAccessToken();
        };

        // Create the connector
        const syncUrl = import.meta.env.VITE_POWERSYNC_URL;
        const syncConnector = new PowerSyncBackendConnector({
          endpoint: syncUrl,
          fetchImpl: PowerSyncFetchImpl.fetch,
          tokenProvider: getToken,
        });

        setConnector(syncConnector);
        
        // Set up listeners
        syncConnector.on('statusChange', (newStatus) => {
          setStatus(newStatus);
        });
        
        syncConnector.on('error', (err) => {
          setError(err);
        });
        
        // Connect
        await syncConnector.connect();
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    
    void createConnector();
    
    return () => {
      connector?.disconnect();
    };
  }, [user?.useSync]);

  return useMemo(
    () => ({
      connector,
      status,
      error,
      resetConnector,
    }),
    [connector, status, error, resetConnector],
  );
}
