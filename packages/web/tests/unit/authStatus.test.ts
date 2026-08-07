import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('~/lib/auth-client', async () => {
  const actual =
    await vi.importActual<typeof import('~/lib/auth-client')>(
      '~/lib/auth-client',
    );

  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      getSession: authMocks.getSession,
    },
  };
});

import {
  createOfflineAuthStatus,
  readAuthStatus,
} from '~/features/auth/hooks/useFetchAuthStatus';
import { AuthClientError } from '~/lib/auth-client';

describe('auth status', () => {
  beforeEach(() => {
    authMocks.getSession.mockReset();
  });

  it('maps an absent session to unauthenticated', async () => {
    authMocks.getSession.mockResolvedValue({ data: null, error: null });

    await expect(readAuthStatus()).resolves.toMatchObject({
      state: 'unauthenticated',
      result: false,
      user: null,
    });
  });

  it('maps the cookie session without persisting its token', async () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const user = {
      id: 'user-id',
      name: 'Luca',
      email: 'luca@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date('2029-01-01T00:00:00.000Z'),
      updatedAt: new Date('2029-01-01T00:00:00.000Z'),
    };
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          id: 'session-id',
          token: 'must-not-be-exposed',
          expiresAt,
        },
        user,
      },
      error: null,
    });

    const status = await readAuthStatus();

    expect(status).toMatchObject({
      state: 'authenticated',
      result: true,
      expiresAt: Math.floor(expiresAt.getTime() / 1000),
      user,
    });
    expect(status).not.toHaveProperty('session');
    expect(JSON.stringify(status)).not.toContain('must-not-be-exposed');
  });

  it('treats an unauthorized response as unauthenticated', async () => {
    authMocks.getSession.mockResolvedValue({
      data: null,
      error: { status: 401, statusText: 'Unauthorized' },
    });

    await expect(readAuthStatus()).resolves.toMatchObject({
      state: 'unauthenticated',
      result: false,
    });
  });

  it('surfaces server availability failures instead of signing out', async () => {
    authMocks.getSession.mockResolvedValue({
      data: null,
      error: {
        status: 503,
        statusText: 'Unavailable',
        message: 'Try again later',
      },
    });

    await expect(readAuthStatus()).rejects.toBeInstanceOf(AuthClientError);
  });

  it('preserves the last authenticated identity while offline', () => {
    const authenticated = {
      state: 'authenticated' as const,
      result: true,
      expiresAt: 1_893_456_000,
      browserOnline: true,
      user: {
        id: 'user-id',
        name: 'Luca',
        email: 'luca@example.com',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      lastCheckedAt: Date.now(),
    };

    expect(createOfflineAuthStatus(authenticated, false)).toMatchObject({
      state: 'offline',
      result: true,
      browserOnline: false,
      user: { id: 'user-id' },
    });
  });
});
