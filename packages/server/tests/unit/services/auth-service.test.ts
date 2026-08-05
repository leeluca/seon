import { createHash } from 'node:crypto';
import type { Context } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JWTService } from '../../../src/services/jwt.service.js';
import { TEST_DB_URL, TEST_USER } from '../../utils/constants.js';

const cookies = new Map<string, string>();

vi.mock('hono/cookie', () => ({
  getCookie: vi.fn((_context, name: string) => cookies.get(name)),
}));

const { createAuthService } = await import(
  '../../../src/services/auth.service.js'
);

function createContext() {
  return {
    req: { raw: new Request('https://example.com') },
  } as unknown as Context;
}

function createJwtService() {
  return {
    getCookieConfig: vi.fn(() => ({
      name: 'access_token',
      options: { maxAge: 900 },
    })),
    verifyToken: vi.fn(async (token: string) =>
      token === 'valid-access-token'
        ? {
            sub: TEST_USER.id,
            exp: Math.floor(Date.now() / 1000) + 900,
            iat: Math.floor(Date.now() / 1000),
            aud: 'authenticated',
            jti: 'test-jti',
          }
        : null,
    ),
  } as unknown as JWTService;
}

function createDatabase() {
  const inserted: Array<Record<string, unknown>> = [];
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const password = { compare: vi.fn(), hash: vi.fn() };
  let refreshSessionRow: {
    userId: string;
    expiresAt: Date;
    revokedAt: string | null;
  } | null = {
    userId: TEST_USER.id,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  };

  const database = {
    insert: vi.fn(() => ({
      values: vi.fn(async (value: Record<string, unknown>) => {
        inserted.push(value);
      }),
    })),
    delete: vi.fn(() => ({ where: deleteWhere })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            limit: vi.fn(async () =>
              refreshSessionRow ? [refreshSessionRow] : [],
            ),
          })),
        })),
      })),
    })),
    query: {
      user: {
        findFirst: vi.fn(async () => ({
          id: TEST_USER.id,
          email: TEST_USER.email,
          password: TEST_USER.password,
        })),
      },
    },
  };

  return {
    database,
    deleteWhere,
    inserted,
    password,
    setRefreshSessionRow: (row: typeof refreshSessionRow) => {
      refreshSessionRow = row;
    },
  };
}

describe('Auth Service', () => {
  beforeEach(() => {
    cookies.clear();
    vi.stubEnv('DB_URL', TEST_DB_URL);
  });

  it('stores only a hash of the opaque refresh token', async () => {
    const mocks = createDatabase();
    const authService = await createAuthService(createContext(), {
      jwtService: createJwtService(),
      deps: {
        getDatabase: () => mocks.database as never,
        createRefreshToken: () => 'plain-refresh-secret',
      },
    });

    const session = await authService.issueRefreshSession(
      TEST_USER.id,
      '604800',
    );

    expect(session.token).toBe('plain-refresh-secret');
    expect(mocks.inserted).toHaveLength(1);
    expect(mocks.inserted[0]).toMatchObject({
      userId: TEST_USER.id,
      tokenHash: createHash('sha256')
        .update('plain-refresh-secret')
        .digest('hex'),
    });
    expect(JSON.stringify(mocks.inserted[0])).not.toContain(
      'plain-refresh-secret',
    );
  });

  it('rejects an invalid refresh-session expiration before writing', async () => {
    const mocks = createDatabase();
    const authService = await createAuthService(createContext(), {
      jwtService: createJwtService(),
      deps: { getDatabase: () => mocks.database as never },
    });

    await expect(
      authService.issueRefreshSession(TEST_USER.id, ''),
    ).rejects.toThrow(
      'REFRESH_SESSION_EXPIRATION must be a positive integer number of seconds',
    );
    expect(mocks.database.insert).not.toHaveBeenCalled();
  });

  it('validates a live refresh session without rotating it', async () => {
    const mocks = createDatabase();
    cookies.set('refresh_token', 'stable-refresh-secret');
    const authService = await createAuthService(createContext(), {
      jwtService: createJwtService(),
      deps: { getDatabase: () => mocks.database as never },
    });

    await expect(
      authService.validateRefreshSession(createContext()),
    ).resolves.toMatchObject({
      token: 'stable-refresh-secret',
      userId: TEST_USER.id,
    });
    expect(mocks.database.insert).not.toHaveBeenCalled();
  });

  it('rejects expired and revoked refresh sessions', async () => {
    const mocks = createDatabase();
    cookies.set('refresh_token', 'expired-refresh-secret');
    mocks.setRefreshSessionRow({
      userId: TEST_USER.id,
      expiresAt: new Date(Date.now() - 1),
      revokedAt: null,
    });
    const authService = await createAuthService(createContext(), {
      jwtService: createJwtService(),
      deps: { getDatabase: () => mocks.database as never },
    });

    await expect(
      authService.validateRefreshSession(createContext()),
    ).resolves.toBeNull();
  });

  it('revokes the refresh session represented by the cookie', async () => {
    const mocks = createDatabase();
    cookies.set('refresh_token', 'refresh-to-revoke');
    const authService = await createAuthService(createContext(), {
      jwtService: createJwtService(),
      deps: { getDatabase: () => mocks.database as never },
    });

    await authService.revokeRefreshSession(createContext());

    expect(mocks.deleteWhere).toHaveBeenCalledOnce();
  });

  it('continues to validate short-lived access JWTs statelessly', async () => {
    const mocks = createDatabase();
    cookies.set('access_token', 'valid-access-token');
    const jwtService = createJwtService();
    const authService = await createAuthService(createContext(), {
      jwtService,
      deps: { getDatabase: () => mocks.database as never },
    });

    const result = await authService.validateAccessToken(createContext());

    expect(result.accessPayload?.sub).toBe(TEST_USER.id);
    expect(jwtService.verifyToken).toHaveBeenCalledOnce();
    expect(mocks.database.select).not.toHaveBeenCalled();
  });
});
