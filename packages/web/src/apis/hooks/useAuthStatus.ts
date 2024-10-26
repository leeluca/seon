import type { useUser } from '~/states/userContext';
import type { APIError } from '~/utils/errors';

import useSWR from 'swr';

import { FAILED_TO_FETCH } from '~/constants/errors';
import { SESSION_EXP_KEY } from '~/constants/storage';
import fetcher from '../fetcher';

const getInitialData = () => {
  const sessionExp = localStorage.getItem(SESSION_EXP_KEY);
  const currentTime = Math.floor(Date.now() / 1000);

  if (!sessionExp || Number(sessionExp) < currentTime) {
    return { result: false, expiresAt: 0 };
  }
  return { result: true, expiresAt: Number(sessionExp) };
};

interface AuthStatus {
  result: boolean;
  expiresAt: number;
}

export const AUTH_STATUS_KEY = `/api/auth/status`;

function useAuthStatus(user: ReturnType<typeof useUser>) {
  const { data, error, isLoading } = useSWR<AuthStatus, APIError>(
    user?.useSync ? AUTH_STATUS_KEY : null,
    (url: string) => fetcher(url),
    {
      errorRetryCount: 3,
      focusThrottleInterval: 30000, // 30 sec
      dedupingInterval: 10000, // 10 sec
      fallbackData: user && getInitialData(),
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
      onSuccess: (data) => {
        localStorage.setItem(SESSION_EXP_KEY, JSON.stringify(data.expiresAt));
      },
      onError: (err) => {
        if (err.status === 401) {
          localStorage.removeItem(SESSION_EXP_KEY);
        }
      },
    },
  );

  let authStatus;

  // If server not reachable, return auth status saved in localStorage
  if (error?.message === FAILED_TO_FETCH) {
    authStatus = getInitialData();
  } else {
    authStatus = {
      result: !error && !!data?.result,
      expiresAt: data?.expiresAt || 0,
    };
  }

  return {
    data: authStatus,
    isLoading,
    isError: !!error,
    error,
  };
}

export default useAuthStatus;
