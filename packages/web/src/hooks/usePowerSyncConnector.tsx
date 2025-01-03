import { useCallback, useEffect, useMemo, useState } from 'react';
import Logger from 'js-logger';

import { powerSyncDb } from '~/lib/database';
import { SupabaseConnector } from '~/lib/powersync/SupabaseConnector';
import { useAuthContext } from '~/states/userContext';

export function usePowerSyncConnector() {
  const { isSignInVerified } = useAuthContext();

  const [connector, setConnector] = useState(new SupabaseConnector());
  const [powerSync] = useState(powerSyncDb);

  useEffect(() => {
    if (!isSignInVerified) return;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    Logger.useDefaults();
    Logger.setLevel(Logger.DEBUG);
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
