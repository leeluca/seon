import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';
import type { JWK } from 'jose';
import type { KeyObject } from 'node:crypto';

interface JWTKeys {
  jwtPrivateKey: string | CryptoKey;
  jwtPublicKey: string | CryptoKey;
  jwtRefreshSecret: string | KeyObject;
  jwtDbPrivateKey: string | KeyObject;
  publicKeyJWK: JWK;
  publicKeyKid: string;
}

interface JWTConfig {
  expiration: number;
  algorithm: string;
  signingKey: string | KeyObject;
  verificationKey: string | KeyObject;
  aud: string;
  role: string;
  kid: string;
  cookieName: string;
}

// Mock the jwt-store module
vi.mock('../../../src/services/jwt-store.js', () => {
  let jwtKeys: JWTKeys | null = null;
  let jwtConfigs: Record<string, JWTConfig> | null = null;

  return {
    getOrInitJwtKeys: vi.fn().mockImplementation(() => {
      if (!jwtKeys) {
        jwtKeys = {
          jwtPrivateKey: 'mocked-private-key',
          jwtPublicKey: 'mocked-public-key',
          jwtRefreshSecret: 'mocked-refresh-secret',
          jwtDbPrivateKey: 'mocked-db-private-key',
          publicKeyJWK: { kid: 'test-kid' },
          publicKeyKid: 'test-kid',
        };
      }
      return jwtKeys;
    }),
    getOrInitJwtConfigs: vi.fn().mockImplementation(() => {
      if (!jwtConfigs) {
        jwtConfigs = {
          access: {
            expiration: 900,
            algorithm: 'RS256',
            signingKey: 'mocked-private-key',
            verificationKey: 'mocked-public-key',
            aud: 'authenticated',
            role: 'authenticated',
            kid: 'test-kid',
            cookieName: 'access_token',
          },
          refresh: {
            expiration: 604800,
            algorithm: 'HS256',
            signingKey: 'mocked-refresh-secret',
            verificationKey: 'mocked-refresh-secret',
            aud: '',
            role: '',
            kid: '',
            cookieName: 'refresh_token',
          },
          db_access: {
            expiration: 900,
            algorithm: 'HS256',
            signingKey: 'mocked-db-private-key',
            verificationKey: 'mocked-db-private-key',
            aud: 'authenticated',
            role: 'authenticated',
            kid: '1',
            cookieName: 'db_access_token',
          },
        };
      }
      return jwtConfigs;
    }),
    resetJwtStore: vi.fn().mockImplementation(() => {
      jwtKeys = null;
      jwtConfigs = null;
    }),
  };
});

// Mock the jwt module
vi.mock('../../../src/services/jwt.js', () => {
  return {
    initJWTKeys: vi.fn().mockImplementation(() => {
      return {
        jwtPrivateKey: 'mocked-private-key',
        jwtPublicKey: 'mocked-public-key',
        jwtRefreshSecret: 'mocked-refresh-secret',
        jwtDbPrivateKey: 'mocked-db-private-key',
        publicKeyJWK: { kid: 'test-kid' },
        publicKeyKid: 'test-kid',
      };
    }),
    createJWTConfigs: vi.fn().mockImplementation(() => {
      return {
        access: {
          expiration: 900,
          algorithm: 'RS256',
          signingKey: 'mocked-private-key',
          verificationKey: 'mocked-public-key',
          aud: 'authenticated',
          role: 'authenticated',
          kid: 'test-kid',
          cookieName: 'access_token',
        },
        refresh: {
          expiration: 604800,
          algorithm: 'HS256',
          signingKey: 'mocked-refresh-secret',
          verificationKey: 'mocked-refresh-secret',
          aud: '',
          role: '',
          kid: '',
          cookieName: 'refresh_token',
        },
        db_access: {
          expiration: 900,
          algorithm: 'HS256',
          signingKey: 'mocked-db-private-key',
          verificationKey: 'mocked-db-private-key',
          aud: 'authenticated',
          role: 'authenticated',
          kid: '1',
          cookieName: 'db_access_token',
        },
      };
    }),
    signJWT: vi.fn().mockResolvedValue('mocked-jwt-token'),
    signJWTWithPayload: vi.fn().mockResolvedValue({
      token: 'mocked-jwt-token',
      payload: {
        sub: '01HQ5GMZN7MMVFHBF6YVPFQJ4R',
        exp: Math.floor(Date.now() / 1000) + 900,
        iat: Math.floor(Date.now() / 1000),
        aud: 'authenticated',
        role: 'authenticated',
      },
    }),
    verifyJWT: vi.fn().mockImplementation((token) => {
      if (token === 'invalid.token.here') {
        return null;
      }
      return {
        sub: '01HQ5GMZN7MMVFHBF6YVPFQJ4R',
        exp: Math.floor(Date.now() / 1000) + 900,
        iat: Math.floor(Date.now() / 1000),
        aud: 'authenticated',
        role: 'authenticated',
      };
    }),
    getCookieConfig: vi.fn().mockImplementation((jwtType: string) => {
      const configs: Record<
        string,
        { cookieName: string; expiration: number }
      > = {
        access: {
          cookieName: 'access_token',
          expiration: 900,
        },
        refresh: {
          cookieName: 'refresh_token',
          expiration: 604800,
        },
        db_access: {
          cookieName: 'db_access_token',
          expiration: 900,
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
  getDb: vi.fn().mockImplementation(() => ({
    transaction: vi.fn().mockImplementation(async (fn) => {
      await fn({
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      });
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([
              { token: 'test-token', userId: '01HQ5GMZN7MMVFHBF6YVPFQJ4R' },
            ]),
          innerJoin: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                refresh_token: {
                  token: 'test-token',
                  userId: '01HQ5GMZN7MMVFHBF6YVPFQJ4R',
                },
                user: {
                  id: '01HQ5GMZN7MMVFHBF6YVPFQJ4R',
                  email: 'test@example.com',
                },
              },
            ]),
          }),
        }),
      }),
    }),
    query: {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: '01HQ5GMZN7MMVFHBF6YVPFQJ4R',
          email: 'test@example.com',
          password: 'hashed.password',
        }),
      },
    },
  })),
}));

// Mock the hono/context-storage module
vi.mock('hono/context-storage', () => ({
  getContext: vi.fn().mockReturnValue({
    env: { DB_URL: 'postgres://test' },
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

import {
  resetAuthService,
  useAuthService,
  type Dependencies,
} from '../../../src/services/index.js';
import { mockJwtConfig } from '../../utils/mock.js';

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
          DB_URL: 'postgres://test',
        },
        cookies: {
          refresh_token: 'valid-refresh-token',
        },
      });

      const authService = await useAuthService(mockContext);
      const { refreshToken, refreshPayload } =
        await authService.verifyRefreshToken(mockContext);

      expect(refreshToken).toBe('valid-refresh-token');
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
          access_token: 'valid-access-token',
        },
      });

      const authService = await useAuthService(mockContext);
      const { accessToken, accessPayload } =
        await authService.validateAccessToken(mockContext);

      expect(accessToken).toBe('valid-access-token');
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
          access_token: 'invalid.token.here',
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
        'test@example.com',
        'password123',
        'postgres://test',
      );

      expect(isValid).toBe(true);
      expect(user).toBeTruthy();
      expect(user?.email).toBe('test@example.com');
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
        'test@example.com',
        'wrong-password',
        'postgres://test',
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
          DB_URL: 'postgres://test',
        },
      });

      const authService = await useAuthService(mockContext);
      const userId = '01HQ5GMZN7MMVFHBF6YVPFQJ4R';

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
          DB_URL: 'postgres://test',
        },
        cookies: {
          refresh_token: 'valid-refresh-token',
        },
      });

      const authService = await useAuthService(mockContext);
      const result = await authService.validateRefreshToken(mockContext);

      expect(result.refreshToken).toBe('valid-refresh-token');
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
          DB_URL: 'postgres://test',
        },
      });

      const authService = await useAuthService(mockContext);

      // This shouldn't throw an error if the mocks are correctly set up
      await expect(
        authService.saveNewRefreshToken(
          '01HQ5GMZN7MMVFHBF6YVPFQJ4R',
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

      expect(accessConfig.name).toBe('access_token');
      expect(refreshConfig.name).toBe('refresh_token');
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
          initKeys: vi.fn().mockResolvedValue({
            jwtPrivateKey: 'mocked-private-key',
            jwtPublicKey: 'mocked-public-key',
            jwtRefreshSecret: 'mocked-refresh-secret',
            jwtDbPrivateKey: 'mocked-db-private-key',
            publicKeyJWK: { kid: 'test-kid' },
            publicKeyKid: 'test-kid',
          }),
          createConfigs: vi.fn().mockReturnValue({
            access: {
              expiration: 900,
              algorithm: 'RS256',
              signingKey: 'mocked-private-key',
              verificationKey: 'mocked-public-key',
              aud: 'authenticated',
              role: 'authenticated',
              kid: 'test-kid',
              cookieName: 'access_token',
            },
            refresh: {
              expiration: 604800,
              algorithm: 'HS256',
              signingKey: 'mocked-refresh-secret',
              verificationKey: 'mocked-refresh-secret',
              aud: '',
              role: '',
              kid: '',
              cookieName: 'refresh_token',
            },
            db_access: {
              expiration: 900,
              algorithm: 'HS256',
              signingKey: 'mocked-db-private-key',
              verificationKey: 'mocked-db-private-key',
              aud: 'authenticated',
              role: 'authenticated',
              kid: '1',
              cookieName: 'db_access_token',
            },
          }),
          signToken: vi.fn().mockResolvedValue('mocked-token'),
          signTokenWithPayload: vi.fn().mockResolvedValue({
            token: 'mocked-token',
            payload: { sub: 'test-user-id' },
          }),
          verifyToken: vi.fn().mockResolvedValue({ sub: 'test-user-id' }),
          getCookieConfig: vi.fn().mockReturnValue({
            name: 'access_token',
            options: { maxAge: 900 },
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
