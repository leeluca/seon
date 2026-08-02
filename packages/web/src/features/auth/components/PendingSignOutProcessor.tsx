import { useEffect } from 'react';
import { onlineManager, useQueryClient } from '@tanstack/react-query';

import { AUTH_STATUS } from '~/constants/query';
import { PENDING_SIGN_OUT_KEY } from '~/constants/storage';
import {
  flushPendingSignOut,
  hasPendingSignOut,
} from '~/data/workspace/pendingSignOut';
import { createUnauthenticatedAuthStatus } from '~/features/auth/hooks/useFetchAuthStatus';

export function PendingSignOutProcessor() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let processing = false;
    let retryTimer: number | undefined;
    let retryDelay = 5_000;

    const scheduleRetry = (flush: () => Promise<void>) => {
      if (!active || retryTimer !== undefined) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        void flush();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 5 * 60_000);
    };

    const flush = async () => {
      if (processing || !onlineManager.isOnline()) {
        return;
      }
      processing = true;
      try {
        if (!(await hasPendingSignOut())) return;
        const completed = await flushPendingSignOut();
        if (!active) return;
        if (!completed) {
          scheduleRetry(flush);
          return;
        }

        queryClient.setQueryData(
          AUTH_STATUS.all.queryKey,
          createUnauthenticatedAuthStatus(),
        );
      } catch (error) {
        console.error('Could not process the pending sign out', error);
        scheduleRetry(flush);
      } finally {
        processing = false;
      }
    };

    void flush();
    const unsubscribe = onlineManager.subscribe((online) => {
      if (!online) return;
      retryDelay = 5_000;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      retryTimer = undefined;
      void flush();
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PENDING_SIGN_OUT_KEY || event.newValue === null) return;
      queryClient.setQueryData(
        AUTH_STATUS.all.queryKey,
        createUnauthenticatedAuthStatus(),
      );
      retryDelay = 5_000;
      void flush();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      active = false;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener('storage', onStorage);
      unsubscribe();
    };
  }, [queryClient]);

  return null;
}
