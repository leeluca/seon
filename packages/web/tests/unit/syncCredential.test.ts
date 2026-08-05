import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetcherMock = vi.hoisted(() => vi.fn());

vi.mock('~/apis/fetcher', () => ({ default: fetcherMock }));

import {
  clearCredentialCache,
  fetchSyncCredentials,
  getDbAccessToken,
} from '~/data/sync/credential';

describe('sync credentials', () => {
  beforeEach(() => {
    fetcherMock.mockReset();
    clearCredentialCache();
  });

  it('rejects credentials issued for a different local account', async () => {
    fetcherMock.mockResolvedValue({
      result: true,
      token: 'account-b-token',
      userId: 'account-b',
      expiresAt: Math.floor(Date.now() / 1000) + 900,
      syncUrl: 'https://sync.example.com',
    });

    await expect(fetchSyncCredentials('account-a')).rejects.toMatchObject({
      status: 409,
      code: 'LOCAL_ACCOUNT_CONFLICT',
    });
  });

  it('single-flights database credential requests and caches only in memory', async () => {
    fetcherMock.mockResolvedValue({
      result: true,
      token: 'database-token',
      userId: 'account-a',
      expiresAt: Math.floor(Date.now() / 1000) + 900,
    });

    await expect(
      Promise.all([
        getDbAccessToken('account-a'),
        getDbAccessToken('account-a'),
      ]),
    ).resolves.toEqual(['database-token', 'database-token']);
    expect(fetcherMock).toHaveBeenCalledOnce();
    expect(sessionStorage.length).toBe(0);
  });
});
