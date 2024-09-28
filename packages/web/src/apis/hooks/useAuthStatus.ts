import useSWR from 'swr';

import { API_URL } from '~/constants';
import { useUser } from '~/states/userContext';
import fetcher from './fetcher';

interface AuthStatus {
  result: boolean;
  expiresAt: number;
}

export const AUTH_STATUS_KEY = `${API_URL}/api/auth/status`;

function useAuthStatus() {
  const user = useUser();
  const { data, error, isLoading } = useSWR<AuthStatus, null>(
    user?.useSync ? AUTH_STATUS_KEY : null,
    (url: string) => fetcher(url, { credentials: 'include' }),
    { errorRetryCount: 3, shouldRetryOnError: false, revalidateOnFocus: true },
  );

  const authStatus = {
    isSignedIn: !!data?.result,
    expiresAt: data?.expiresAt || 0,
  };
  return {
    data: authStatus,
    isLoading,
    isError: error,
  };
}

export default useAuthStatus;
