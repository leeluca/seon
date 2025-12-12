import type { Context } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MOCK_JWT_CONFIGS,
  MOCK_JWT_KEYS,
  MOCK_JWT_PAYLOAD,
  MOCK_TOKENS,
  TEST_DB_URL,
  TEST_USER,
} from '../../utils/constants.js';
import { mockJwtConfig } from '../../utils/mock.js';

const createMockJwtService = () => ({
  signToken: vi.fn().mockResolvedValue('mocked-jwt-token'),
  signTokenWithPayload: vi.fn().mockResolvedValue({
    token: 'mocked-jwt-token',
    payload: { ...MOCK_JWT_PAYLOAD },
  }),
  verifyToken: vi.fn().mockImplementation((token) => {
    if (token === MOCK_TOKENS.invalid) {
      return null;
    }
    return { ...MOCK_JWT_PAYLOAD };
  }),
  getCookieConfig: vi.fn().mockImplementation((jwtType: string) => {
    const configs: Record<string, { cookieName: string; expiration: number }> =
      {
        access: {
          cookieName: MOCK_JWT_CONFIGS.access.cookieName,
          expiration: MOCK_JWT_CONFIGS.access.expiration,
        },
        refresh: {
          cookieName: MOCK_JWT_CONFIGS.refresh.cookieName,
          expiration: MOCK_JWT_CONFIGS.refresh.expiration,
        },
        db_access: {
          cookieName: MOCK_JWT_CONFIGS.db_access.cookieName,
          expiration: MOCK_JWT_CONFIGS.db_access.expiration,
        },
      };

    return {
      name: configs[jwtType]?.cookieName || `${jwtType}_token`,
      options: {
        maxAge: configs[jwtType]?.expiration || 900,
        expires: new Date(
          Date.now() + (configs[jwtType]?.expiration || 900) * 1000,
        ),
      },
    };
  }),
  setJWTCookie: vi.fn(),
  getJWTConfigs: vi.fn().mockReturnValue(MOCK_JWT_CONFIGS),
  getJWTKeys: vi.fn().mockReturnValue(MOCK_JWT_KEYS),
  getJWKS: vi.fn(),
  verifyCookieToken: vi.fn().mockResolvedValue({ ...MOCK_JWT_PAYLOAD }),
});

let mockJwtService = createMockJwtService();

vi.mock('../../../src/services/jwt.service.js', () => {
  return {
    createJWTService: vi.fn().mockImplementation(async () => mockJwtService),
    resetJWTCache: vi.fn(),
  };
});

// Mock database
vi.mock('../../../src/db/db.js', () => ({
  getDb: vi.fn().mockImplementation(() => {
    const topLevelDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const txDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const txInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const mockRowsWithAliases = [
      {
        token: 'test-token',
        userId: TEST_USER.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      },
    ];

    return {
      // used in deleteExpiredRefreshTokens()
      delete: topLevelDelete,

      transaction: vi.fn().mockImplementation(async (fn) => {
        await fn({
          delete: txDelete,
          insert: txInsert,
        });
      }),

      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            // fallback without join
            limit: vi.fn().mockResolvedValue(mockRowsWithAliases),
            // with join path used by service
            innerJoin: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockRowsWithAliases),
            }),
          }),
        }),
      }),

      query: {
        user: {
          findFirst: vi.fn().mockResolvedValue({
            id: TEST_USER.id,
            email: TEST_USER.email,
            password: TEST_USER.password,
          }),
        },
      },
    };
  }),
}));

vi.mock('hono/context-storage', () => ({
  getContext: vi.fn().mockReturnValue({
    env: { DB_URL: TEST_DB_URL },
  }),
}));

// Mock Cookie functions
const mockCookies = new Map();
vi.mock('hono/cookie', () => ({
  setCookie: vi.fn().mockImplementation((c, name, value) => {
    mockCookies.set(name, value);
    c.res.headers.set = vi.fn();
  }),
  getCookie: vi.fn().mockImplementation((_c, name) => {
    return mockCookies.get(name);
  }),
}));

function createTestMockContext(
  options: {
    env?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {},
): Context {
  mockCookies.clear();

  if (options.cookies) {
    for (const [name, value] of Object.entries(options.cookies)) {
      mockCookies.set(name, value);
    }
  }

  return {
    req: {
      raw: new Request('https://example.com'),
      header: (_name: string) => null,
      headers: new Headers(),
    },
    env: (key: string) => options.env?.[key] || '',
    get: (key: string) => ({})[key],
    set: (_key: string, _value: unknown) => {},
    var: {},
    res: {
      headers: {
        set: vi.fn(),
      },
    },
  } as unknown as Context;
}

type AuthServiceDeps =
  import('../../../src/services/auth.service.js').AuthServiceDeps;

const { createJWTService } = await import(
  '../../../src/services/jwt.service.js'
);
const createJWTServiceMock = vi.mocked(createJWTService);

const { createAuthService } = await import(
  '../../../src/services/auth.service.js'
);

describe('Auth Service', () => {
  beforeEach(() => {
    mockJwtService = createMockJwtService();
    createJWTServiceMock.mockResolvedValue(mockJwtService);
    vi.clearAllMocks();
    mockCookies.clear();
  });

  describe('Service initialization', () => {
    it('should initialize auth service with default dependencies', async () => {
      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
        },
      });

      const authService = await createAuthService(mockContext);
      expect(authService).toBeDefined();
      expect(authService.validateCredentials).toBeDefined();
      expect(authService.issueRefreshToken).toBeDefined();
    });

    it('should create new instances each time (no caching)', async () => {
      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
        },
      });

      const service1 = await createAuthService(mockContext);
      const service2 = await createAuthService(mockContext);
      // Services are now created fresh each time (per-request)
      expect(service1).not.toBe(service2);
    });

    it('should use provided jwtService when passed as option', async () => {
      const customJwtService = createMockJwtService();
      customJwtService.signToken.mockResolvedValue('custom-token');

      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
        },
      });

      const authService = await createAuthService(mockContext, {
        jwtService: customJwtService,
      });

      // The auth service should use the provided JWT service
      expect(authService).toBeDefined();
    });
  });

  describe('Token validation and issuance', () => {
    it('should validate refresh token', async () => {
      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
          DB_URL: TEST_DB_URL,
        },
        cookies: {
          refresh_token: MOCK_TOKENS.valid.refresh,
        },
      });

      const authService = await createAuthService(mockContext);
      const { refreshToken, refreshPayload } =
        await authService.verifyRefreshToken(mockContext);

      expect(refreshToken).toBe(MOCK_TOKENS.valid.refresh);
      expect(refreshPayload).toBeTruthy();
    });

    it('should validate access token', async () => {
      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
        },
        cookies: {
          access_token: MOCK_TOKENS.valid.access,
        },
      });

      const authService = await createAuthService(mockContext);
      const { accessToken, accessPayload } =
        await authService.validateAccessToken(mockContext);

      expect(accessToken).toBe(MOCK_TOKENS.valid.access);
      expect(accessPayload).toBeTruthy();
    });

    it('should return null payload for invalid token', async () => {
      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
        },
        cookies: {
          access_token: MOCK_TOKENS.invalid,
        },
      });

      const authService = await createAuthService(mockContext);
      const { accessPayload } =
        await authService.validateAccessToken(mockContext);

      expect(accessPayload).toBeNull();
    });

    it('should validate credentials successfully', async () => {
      const customDeps: Partial<AuthServiceDeps> = {
        passwordUtils: {
          compare: vi.fn().mockResolvedValue(true),
          hash: vi.fn().mockResolvedValue('hashed.password'),
        },
      };

      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
        },
      });

      const authService = await createAuthService(mockContext, {
        deps: customDeps,
      });
      const { isValid, user } = await authService.validateCredentials(
        TEST_USER.email,
        'password123',
        TEST_DB_URL,
      );

      expect(isValid).toBe(true);
      expect(user).toBeTruthy();
      expect(user?.email).toBe(TEST_USER.email);
    });

    it('should fail credential validation with incorrect password', async () => {
      const customDeps: Partial<AuthServiceDeps> = {
        passwordUtils: {
          compare: vi.fn().mockResolvedValue(false),
          hash: vi.fn().mockResolvedValue('hashed.password'),
        },
      };

      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
        },
      });

      const authService = await createAuthService(mockContext, {
        deps: customDeps,
      });
      const { isValid, user } = await authService.validateCredentials(
        TEST_USER.email,
        'wrong-password',
        TEST_DB_URL,
      );

      expect(isValid).toBe(false);
      expect(user).toBeNull();
    });

    it('should issue a refresh token', async () => {
      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
          DB_URL: TEST_DB_URL,
        },
      });

      const authService = await createAuthService(mockContext);
      const userId = TEST_USER.id;

      const result = await authService.issueRefreshToken(userId, mockJwtConfig);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('payload');
      expect(result.payload.sub).toBe(userId);
    });
  });

  describe('Database interactions', () => {
    it('should validate database-stored refresh token', async () => {
      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
          DB_URL: TEST_DB_URL,
        },
        cookies: {
          refresh_token: MOCK_TOKENS.valid.refresh,
        },
      });

      const authService = await createAuthService(mockContext);
      const result = await authService.validateRefreshToken(mockContext);

      expect(result.refreshToken).toBe(MOCK_TOKENS.valid.refresh);
      expect(result.refreshPayload).toBeTruthy();
    });

    it('should save a new refresh token to the database', async () => {
      const mockContext = createTestMockContext({
        env: {
          JWT_PRIVATE_KEY: mockJwtConfig.privateKey,
          JWT_PUBLIC_KEY: mockJwtConfig.publicKey,
          JWT_REFRESH_SECRET: mockJwtConfig.refreshSecret,
          JWT_DB_PRIVATE_KEY: mockJwtConfig.dbPrivateKey,
          JWT_ACCESS_EXPIRATION: mockJwtConfig.accessExpiration,
          JWT_REFRESH_EXPIRATION: mockJwtConfig.refreshExpiration,
          JWT_DB_ACCESS_EXPIRATION: mockJwtConfig.dbAccessExpiration,
          DB_URL: TEST_DB_URL,
        },
      });

      const authService = await createAuthService(mockContext);

      // This shouldn't throw an error if the mocks are correctly set up
      await expect(
        authService.saveNewRefreshToken(
          TEST_USER.id,
          'new-refresh-token',
          mockJwtConfig,
        ),
      ).resolves.not.toThrow();
    });
  });
});
