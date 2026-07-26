import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { activeWorkspace, powerSyncDb } from '~/data/db/database';
import { PowerSyncConnector } from '~/data/sync/PowerSyncConnector';
import { useFetchAuthStatus } from '~/features/auth/hooks/useFetchAuthStatus';

export function usePowerSyncConnector() {
  const { data, authState } = useFetchAuthStatus();
  const queryClient = useQueryClient();
  const powerSync = powerSyncDb;
  const connector = useMemo(
    () =>
      new PowerSyncConnector({
        workspace: activeWorkspace,
        onAuthenticationRequired: () => {
          void powerSync.disconnect();
          void queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
        },
      }),
    [queryClient],
  );
  const accountMatchesWorkspace =
    activeWorkspace.kind === 'account' &&
    activeWorkspace.syncBinding.ownerAccountId === data.user?.id;
  const usesPowerSync =
    activeWorkspace.kind === 'account' &&
    activeWorkspace.syncBinding.provider === 'powersync';
  const syncEnabled =
    authState === 'authenticated' &&
    Boolean(data.user?.emailVerified) &&
    accountMatchesWorkspace &&
    usesPowerSync;

  useEffect(() => {
    let cancelled = false;
    const updateConnection = async () => {
      await powerSync.init();
      if (cancelled) return;
      if (syncEnabled) {
        connector.markAuthenticated();
        await powerSync.connect(connector);
      } else {
        await powerSync.disconnect();
      }
    };

    void updateConnection();
    return () => {
      cancelled = true;
    };
  }, [connector, syncEnabled]);

  return useMemo(
    () => ({
      connector,
      powerSync,
      syncEnabled,
      accountMatchesWorkspace,
    }),
    [connector, syncEnabled, accountMatchesWorkspace],
  );
}
