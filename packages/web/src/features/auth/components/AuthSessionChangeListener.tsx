import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { AUTH_STATUS } from '~/constants/query';
import { AUTH_CHANGE_KEY } from '~/constants/storage';
import { powerSyncDb } from '~/data/db/database';
import { createUnauthenticatedAuthStatus } from '~/features/auth/hooks/useFetchAuthStatus';

export function AuthSessionChangeListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_CHANGE_KEY || event.newValue === null) return;

      // Cookies are shared between tabs while React Query state is not. Stop
      // remote work before resolving which account the cookie now belongs to.
      void powerSyncDb.disconnect();
      let reason: unknown;
      try {
        reason = (JSON.parse(event.newValue) as { reason?: unknown }).reason;
      } catch {
        // Older and malformed markers still trigger a normal session refresh.
      }
      if (reason === 'password-reset') {
        queryClient.setQueryData(
          AUTH_STATUS.all.queryKey,
          createUnauthenticatedAuthStatus(),
        );
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: AUTH_STATUS.all.queryKey,
      });
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  return null;
}
