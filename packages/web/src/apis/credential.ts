import fetcher from './fetcher';

// TODO: abstract fetch boilerplate
export const fetchSyncCredentials = async () => {
  return fetcher<{
    result: boolean;
    token: string;
    expiresAt: number;
    syncUrl: string;
  }>('/api/auth/credentials/sync');
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
