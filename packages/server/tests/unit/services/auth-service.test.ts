import type { Context } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MOCK_JWT_CONFIGS,
  MOCK_JWT_KEYS,
  MOCK_JWT_PAYLOAD,
  MOCK_TOKENS,
  TEST_DB_URL,
  TEST_USER,
  type JWTConfig,
  type JWTKeys,
} from '../../utils/constants.js';
import { mockJwtConfig } from '../../utils/mock.js';

vi.mock('../../../src/services/jwt-store.js', () => {
  let jwtKeys: JWTKeys | null = null;
  let jwtConfigs: Record<string, JWTConfig> | null = null;

  return {
    getOrInitJwtKeys: vi.fn().mockImplementation(() => {
      if (!jwtKeys) {
        jwtKeys = { ...MOCK_JWT_KEYS };
      }
      return jwtKeys;
    }),
    getOrInitJwtConfigs: vi.fn().mockImplementation(() => {
      if (!jwtConfigs) {
        jwtConfigs = { ...MOCK_JWT_CONFIGS };
      }
      return jwtConfigs;
    }),
    resetJwtStore: vi.fn().mockImplementation(() => {
      jwtKeys = null;
      jwtConfigs = null;
    }),
  };
});

vi.mock('../../../src/services/jwt.js', () => {
  return {
    initJWTKeys: vi.fn().mockImplementation(() => {
      return { ...MOCK_JWT_KEYS };
    }),
    createJWTConfigs: vi.fn().mockImplementation(() => {
      return { ...MOCK_JWT_CONFIGS };
    }),
    signJWT: vi.fn().mockResolvedValue('mocked-jwt-token'),
    signJWTWithPayload: vi.fn().mockResolvedValue({
      token: 'mocked-jwt-token',
      payload: { ...MOCK_JWT_PAYLOAD },
    }),
    verifyJWT: vi.fn().mockImplementation((token) => {
      if (token === MOCK_TOKENS.invalid) {
        return null;
      }
      return { ...MOCK_JWT_PAYLOAD };
    }),
    getCookieConfig: vi.fn().mockImplementation((jwtType: string) => {
      const configs: Record<
        string,
        { cookieName: string; expiration: number }
      > = {
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
  getCookie: vi.fn().mockImplementation((c, name) => {
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
      header: (name: string) => null,
      headers: new Headers(),
    },
    env: (key: string) => options.env?.[key] || '',
    get: (key: string) => ({})[key],
    set: (key: string, value: unknown) => {},
    var: {},
    res: {
      headers: {
        set: vi.fn(),
      },
    },
  } as unknown as Context;
}

type Dependencies = import('../../../src/services/index.js').Dependencies;

const { resetAuthService, useAuthService } = await import(
  '../../../src/services/index.js'
);

describe('Auth Service', () => {
  beforeEach(() => {
    resetAuthService();
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

      const authService = await useAuthService(mockContext);
      expect(authService).toBeDefined();
      expect(authService.getJWTConfigs()).toBeDefined();
      expect(authService.getJWTKeys()).toBeDefined();
    });

    it('should return the same instance for multiple calls to useAuthService', async () => {
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

      const service1 = await useAuthService(mockContext);
      const service2 = await useAuthService(mockContext);
      expect(service1).toBe(service2);
    });

    it('should create a new instance when custom dependencies are provided', async () => {
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

      const customDeps: Partial<Dependencies> = {
        jwtUtils: {
          initKeys: vi.fn().mockResolvedValue({
            jwtPrivateKey: 'custom-private-key',
            jwtPublicKey: 'custom-public-key',
            jwtRefreshSecret: 'custom-refresh-secret',
            jwtDbPrivateKey: 'custom-db-private-key',
            publicKeyJWK: { kid: 'custom-kid' },
            publicKeyKid: 'custom-kid',
          }),
          createConfigs: vi.fn().mockReturnValue({
            access: {
              expiration: 900,
              algorithm: 'RS256',
              signingKey: 'custom-private-key',
              verificationKey: 'custom-public-key',
              aud: 'authenticated',
              role: 'authenticated',
              kid: 'custom-kid',
              cookieName: 'access_token',
            },
          }),
          signToken: vi.fn().mockResolvedValue('custom-token'),
          signTokenWithPayload: vi.fn().mockResolvedValue({
            token: 'custom-token',
            payload: {
              sub: 'userId',
              exp: Math.floor(Date.now() / 1000) + 900,
              iat: Math.floor(Date.now() / 1000),
              aud: 'authenticated',
              role: 'authenticated',
            },
          }),
          verifyToken: vi.fn().mockResolvedValue({
            sub: 'userId',
            exp: Math.floor(Date.now() / 1000) + 900,
            iat: Math.floor(Date.now() / 1000),
            aud: 'authenticated',
            role: 'authenticated',
          }),
          getCookieConfig: vi.fn().mockReturnValue({
            name: 'custom_cookie',
            options: { maxAge: 900 },
          }),
          setJWTCookie: vi.fn(),
        },
      };

      const defaultService = await useAuthService(mockContext);
      const customService = await useAuthService(mockContext, customDeps);

      expect(customService).not.toBe(defaultService);

      const token = await customService.signToken('userId', 'access');
      expect(token).toBe('custom-token');
    });

    it('should reset the service and create a new instance after reset', async () => {
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

      const service1 = await useAuthService(mockContext);
      resetAuthService();
      const service2 = await useAuthService(mockContext);

      expect(service1).not.toBe(service2);
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

      const authService = await useAuthService(mockContext);
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

      const authService = await useAuthService(mockContext);
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

      const authService = await useAuthService(mockContext);
      const { accessPayload } =
        await authService.validateAccessToken(mockContext);

      expect(accessPayload).toBeNull();
    });

    it('should validate credentials successfully', async () => {
      const customDeps: Partial<Dependencies> = {
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

      const authService = await useAuthService(mockContext, customDeps);
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
      const customDeps: Partial<Dependencies> = {
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

      const authService = await useAuthService(mockContext, customDeps);
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

      const authService = await useAuthService(mockContext);
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

      const authService = await useAuthService(mockContext);
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

      const authService = await useAuthService(mockContext);

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

  describe('Cookie configuration', () => {
    it('should get the correct cookie configuration', async () => {
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

      const authService = await useAuthService(mockContext);
      const accessConfig = authService.getCookieConfig('access');
      const refreshConfig = authService.getCookieConfig('refresh');

      expect(accessConfig.name).toBe(MOCK_JWT_CONFIGS.access.cookieName);
      expect(refreshConfig.name).toBe(MOCK_JWT_CONFIGS.refresh.cookieName);
      expect(accessConfig.options).toHaveProperty('maxAge');
      expect(refreshConfig.options).toHaveProperty('maxAge');
    });

    it('should call setJWTCookie with correct parameters', async () => {
      // Clear mocks
      vi.clearAllMocks();

      // Create a mock implementation of the JWT utils
      const setJWTCookieSpy = vi.fn();

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

      // Create custom auth service with mocked dependencies
      const authService = await useAuthService(mockContext, {
        jwtUtils: {
          initKeys: vi.fn().mockResolvedValue({ ...MOCK_JWT_KEYS }),
          createConfigs: vi.fn().mockReturnValue({ ...MOCK_JWT_CONFIGS }),
          signToken: vi.fn().mockResolvedValue('mocked-token'),
          signTokenWithPayload: vi.fn().mockResolvedValue({
            token: 'mocked-token',
            payload: { sub: TEST_USER.id },
          }),
          verifyToken: vi.fn().mockResolvedValue({ sub: TEST_USER.id }),
          getCookieConfig: vi.fn().mockReturnValue({
            name: MOCK_JWT_CONFIGS.access.cookieName,
            options: { maxAge: MOCK_JWT_CONFIGS.access.expiration },
          }),
          setJWTCookie: setJWTCookieSpy,
        },
      });

      // Call the method
      authService.setJWTCookie(mockContext, 'access', 'test-token');

      // Verify the spy was called
      expect(setJWTCookieSpy).toHaveBeenCalledWith(
        mockContext,
        'access',
        'test-token',
        expect.any(Object),
      );
    });
  });
});
