import { useEffect, useState } from 'react';
import { useStatus } from '@powersync/react';
import { useShallow } from 'zustand/react/shallow';

import { useFetchAuthStatus } from '~/features/auth/hooks/useFetchAuthStatus';
import { useDebounceValue } from '~/hooks/useDebounceValue';
import { useTimeout } from '~/hooks/useTimeout';
import { useIsOnline } from '~/states/isOnlineContext';
import { useUserStore } from '~/states/stores/userStore';

export type SyncStatusDisplay =
  /** The device has no connection. */
  | 'offline'
  /** The device is online but the account server did not answer. */
  | 'unreachable'
  | 'checking'
  | 'connecting'
  | 'synced'
  | 'notSignedIn'
  | 'error';

/**
 * One reading of account and sync state for the header button and the
 * settings page, so both always describe the same situation.
 */
export function useSyncStatus() {
  const {
    connected: isSyncConnected,
    dataFlowStatus: { downloading, uploading },
    lastSyncedAt,
    hasSynced,
    connecting,
  } = useStatus();
  const { data, authState } = useFetchAuthStatus();
  const [localUserName, useSync] = useUserStore(
    useShallow((state) => [state.user.name, state.user.useSync]),
  );
  const isOnline = useIsOnline();
  const isSignedIn = authState === 'authenticated';
  const isSyncing = useDebounceValue(downloading || uploading, 200);
  const debouncedConnecting = useDebounceValue(connecting, 400);
  const [isFirstConnecting, setIsFirstConnecting] = useState(true);

  // The sync server can stop answering without an error; give up after a
  // minute instead of showing "connecting" forever.
  const hasTimedOut = useTimeout({
    delay: 60000,
    enabled: !isSyncConnected && isSignedIn && isOnline,
  });

  // `connecting` flips to true a moment after mount; don't flash "synced".
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsFirstConnecting(false), 200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const display: SyncStatusDisplay = (() => {
    if (!isOnline) return 'offline';
    if (authState === 'checking') return 'checking';
    // Someone who never turned on sync isn't waiting on the server.
    if (authState === 'offline') return useSync ? 'unreachable' : 'notSignedIn';
    if (!isSignedIn) return 'notSignedIn';
    if (hasTimedOut) return 'error';
    if (isFirstConnecting || debouncedConnecting) return 'connecting';
    if (isSyncConnected && (isSyncing || hasSynced)) return 'synced';
    return 'error';
  })();

  return {
    display,
    isSignedIn,
    /** Signed in before on this device, but the session is gone now. */
    isSessionExpired: !isSignedIn && Boolean(useSync),
    userName: data.user?.name ?? localUserName,
    email: data.user?.email ?? null,
    isSyncing,
    lastSyncedAt,
  };
}
