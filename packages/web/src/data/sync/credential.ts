import fetcher from '~/apis/fetcher';
import { DB_TOKEN_EXP_KEY, DB_TOKEN_KEY } from '~/constants/storage';

export const fetchSyncCredentials = async () => {
  return fetcher<{
    result: boolean;
    token: string;
    expiresAt: number;
    syncUrl: string;
  }>('/api/auth/credentials/sync');
};

const REFRESH_THRESHOLD = 300; // 5 minutes

const saveToken = (token: string, exp: number) => {
  sessionStorage.setItem(DB_TOKEN_KEY, token);
  sessionStorage.setItem(DB_TOKEN_EXP_KEY, exp.toString());
};

const getTokenFromStorage = () => {
  const token = sessionStorage.getItem(DB_TOKEN_KEY);
  const expiresAt = sessionStorage.getItem(DB_TOKEN_EXP_KEY);
  return {
    token,
    expiresAt: expiresAt ? Number.parseInt(expiresAt, 10) : null,
  };
};

export const fetchDbCredentials = async () => {
  return fetcher<{ token: string; expiresAt: number }>(
    '/api/auth/credentials/db',
  );
};

export const getDbAccessToken = async () => {
  const currentTime = Math.floor(Date.now() / 1000);
  const { token, expiresAt } = getTokenFromStorage();

  if (token && expiresAt && expiresAt > currentTime + REFRESH_THRESHOLD) {
    return token;
  }

  const { token: newToken, expiresAt: newExp } = await fetchDbCredentials();
  saveToken(newToken, newExp);
  return newToken; // or return null
};
