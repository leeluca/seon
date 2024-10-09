import type { APIError } from '~/utils/errors';

import useSWR from 'swr';

import { useUser } from '~/states/userContext';
import fetcher from '../fetcher';

interface AuthStatus {
  result: boolean;
  expiresAt: number;
}

export const AUTH_STATUS_KEY = `/api/auth/status`;

function useAuthStatus() {
  const user = useUser();
  const { data, error, isLoading } = useSWR<AuthStatus, APIError>(
    user?.useSync ? AUTH_STATUS_KEY : null,
    (url: string) => fetcher(url),
    {
      errorRetryCount: 3,
      focusThrottleInterval: 30000, // 30 sec
      dedupingInterval: 5000, // 5 sec
      // fallbackData -> get from local storage
      onErrorRetry(err, _key, _config, _revalidate, { retryCount }) {
        // Never retry for specific status codes.
        const notRetryStatuses = new Set([404, 401, 403]);
        if (notRetryStatuses.has(err.status)) return;

        // Never retry for a specific key.
        // if (key === '/api/') return;

        // Only retry up to 5 times.
        if (retryCount >= 5) return;

        return true;
      },
    },
  );

  // TODO: improve error handling (display tost on error)
  const authStatus = {
    isSignedIn: !error && !!data?.result,
    expiresAt: data?.expiresAt || 0,
  };

  return {
    data: authStatus,
    isLoading,
    isError: error,
  };
}

export default useAuthStatus;
