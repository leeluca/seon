import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { AUTH_STATUS } from '~/constants/query';
import { powerSyncDb } from '~/data/db/database';
import { SupabaseConnector } from '~/data/sync/SupabaseConnector';
import { clearCredentialCache } from '~/data/sync/credential';
import {
  clearLegacyPersistedAuthData,
  flushPendingSignOut,
  subscribeToAuthChanges,
} from '~/features/auth/authSession';
import {
  createUnauthenticatedAuthStatus,
  useFetchAuthStatus,
} from '~/features/auth/hooks/useFetchAuthStatus';
import { useUserStore } from '~/states/stores/userStore';

export function usePowerSyncConnector() {
  const localUserId = useUserStore((state) => state.user.id);
  const { data } = useFetchAuthStatus();
  const queryClient = useQueryClient();
  const [powerSync] = useState(powerSyncDb);

  const onAuthenticationRequired = useCallback(() => {
    clearCredentialCache();
    queryClient.setQueryData(
      AUTH_STATUS.all.queryKey,
      createUnauthenticatedAuthStatus(),
    );
    void powerSync.disconnect();
  }, [powerSync, queryClient]);

  const createConnector = useCallback(
    () => new SupabaseConnector(localUserId, onAuthenticationRequired),
    [localUserId, onAuthenticationRequired],
  );
  const [connector, setConnector] = useState(createConnector);

  useEffect(() => {
    if (connector.ownerAccountId !== localUserId) {
      clearCredentialCache();
      void powerSync.disconnect();
      setConnector(createConnector());
    }
  }, [connector.ownerAccountId, createConnector, localUserId, powerSync]);

  useEffect(
    () =>
      subscribeToAuthChanges((change) => {
        clearCredentialCache();
        void powerSync.disconnect();

        if (change.state === 'signed-out') {
          queryClient.setQueryData(
            AUTH_STATUS.all.queryKey,
            createUnauthenticatedAuthStatus(),
          );
        } else {
          void queryClient.invalidateQueries({
            queryKey: AUTH_STATUS.all.queryKey,
          });
        }
      }),
    [powerSync, queryClient],
  );

  useEffect(() => {
    clearLegacyPersistedAuthData();
    const flush = () => {
      void flushPendingSignOut();
    };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  const isSignInVerified =
    data?.result === true && data.userId === connector.ownerAccountId;

  useEffect(() => {
    if (!isSignInVerified) {
      void powerSync.disconnect();
      return;
    }

    window._powersync = powerSync;
    connector.markAuthenticated();
    let disposed = false;

    const initialize = async () => {
      await powerSync.init();
      if (disposed) return;
      await powerSync.disconnect();
      if (disposed) return;
      await powerSync.connect(connector);
    };

    const listener = connector.registerListener({
      initialized: () => {
        void initialize();
      },
      sessionStarted: () => {},
    });
    connector.init();

    return () => {
      disposed = true;
      listener();
    };
  }, [connector, isSignInVerified, powerSync]);

  const resetConnector = useCallback(() => {
    clearCredentialCache();
    setConnector(createConnector());
  }, [createConnector]);

  return useMemo(
    () => ({ connector, powerSync, resetConnector }),
    [connector, powerSync, resetConnector],
  );
}
