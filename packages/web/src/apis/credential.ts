import { API_URL } from '~/constants';

export const fetchSyncCredentials = async () => {
  const res = await fetch(`${API_URL}/api/auth/credentials/sync`);
  if (!res.ok) throw new Error('Failed to fetch sync credentials');
  return res.json() as Promise<{
    result: boolean;
    token: string;
    expiresAt: number;
    syncUrl: string;
  }>;
};

const REFRESH_THRESHOLD = 300; // 5 minutes

// TODO: move to utils
const saveToken = (token: string, exp: number) => {
  sessionStorage.setItem('dbAccessToken', token);
  sessionStorage.setItem('dbAccessTokenExp', exp.toString());
};
// TODO: delete on logout
const getTokenFromStorage = () => {
  const token = sessionStorage.getItem('dbAccessToken');
  const expiresAt = sessionStorage.getItem('dbAccessTokenExp');
  return { token, expiresAt: expiresAt ? parseInt(expiresAt, 10) : null };
};

export const fetchDbCredentials = async () => {
  {
    const res = await fetch(`${API_URL}}/api/auth/credentials/db`);
    if (!res.ok) throw new Error('Failed to fetch DB access token');
    return res.json() as Promise<{ token: string; expiresAt: number }>;
  }
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
