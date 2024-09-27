import useSWR from 'swr';

import { API_URL } from '~/constants';
import { useUser } from '~/states/userContext';
import fetcher from './fetcher';

interface AuthStatus {
  result: boolean;
  expiresAt: number;
}

export function useAuthStatus() {
  const user = useUser();
  const { data, error, isLoading } = useSWR<AuthStatus, null>(
    user?.useSync ? `${API_URL}/api/auth/status` : null,
    fetcher,
  );

  const authStatus = {
    isLoggedIn: !!data?.result,
    expiresAt: data?.expiresAt || 0,
  };
  return {
    data: authStatus,
    isLoading,
    isError: error,
  };
}
