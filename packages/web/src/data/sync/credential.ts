import fetcher from '~/apis/fetcher';
import { APIError } from '~/utils/errors';

type CredentialResponse = {
  result: boolean;
  token: string;
  userId: string;
  expiresAt: number;
};

type DbCredential = CredentialResponse;

const REFRESH_THRESHOLD = 300;
let cachedDbCredential: DbCredential | null = null;
let dbCredentialPromise: Promise<DbCredential> | null = null;

function assertCredentialOwner(expectedUserId: string, actualUserId: string) {
  if (actualUserId !== expectedUserId) {
    throw new APIError({
      message: 'The authenticated account does not own this local data',
      status: 409,
      statusText: 'Conflict',
      code: 'LOCAL_ACCOUNT_CONFLICT',
    });
  }
}

export const fetchSyncCredentials = async (expectedUserId: string) => {
  const credentials = await fetcher<CredentialResponse & { syncUrl: string }>(
    '/api/auth/credentials/sync',
  );
  assertCredentialOwner(expectedUserId, credentials.userId);
  return credentials;
};

export const fetchDbCredentials = async (expectedUserId: string) => {
  const credentials = await fetcher<DbCredential>('/api/auth/credentials/db');
  assertCredentialOwner(expectedUserId, credentials.userId);
  return credentials;
};

export const clearCredentialCache = () => {
  cachedDbCredential = null;
  dbCredentialPromise = null;
};

export const getDbAccessToken = async (expectedUserId: string) => {
  const currentTime = Math.floor(Date.now() / 1000);
  if (
    cachedDbCredential?.userId === expectedUserId &&
    cachedDbCredential.expiresAt > currentTime + REFRESH_THRESHOLD
  ) {
    return cachedDbCredential.token;
  }

  if (!dbCredentialPromise) {
    const request = fetchDbCredentials(expectedUserId)
      .then((credentials) => {
        cachedDbCredential = credentials;
        return credentials;
      })
      .finally(() => {
        if (dbCredentialPromise === request) dbCredentialPromise = null;
      });
    dbCredentialPromise = request;
  }

  const credentials = await dbCredentialPromise;
  assertCredentialOwner(expectedUserId, credentials.userId);
  return credentials.token;
};
