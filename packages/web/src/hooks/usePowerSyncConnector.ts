import { useCallback, useEffect, useMemo, useState } from 'react';

import { useFetchAuthStatus } from '~/apis/hooks/useFetchAuthStatus';
import { powerSyncDb } from '~/data/db/database';
import { SupabaseConnector } from '~/data/sync/SupabaseConnector';

export function usePowerSyncConnector() {
  const { data, isLoading } = useFetchAuthStatus();

  const isSignInVerified = data?.result && !isLoading;

  const [connector, setConnector] = useState(new SupabaseConnector());
  const [powerSync] = useState(powerSyncDb);

  // FIXME: run powerSync.disconnect() when isSignInVerified is false
  useEffect(() => {
    if (!isSignInVerified) return;

    // For console testing, to be removed
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
  }, [isSignInVerified, connector, powerSync]);

  const resetConnector = useCallback(() => {
    setConnector(new SupabaseConnector());
  }, []);

  return useMemo(
    () => ({
      connector,
      powerSync,
      resetConnector,
    }),
    [connector, powerSync, resetConnector],
  );
}
