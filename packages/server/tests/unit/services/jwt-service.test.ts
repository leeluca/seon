import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_JWT_CONFIGS, TEST_DB_URL } from '../../utils/constants.js';
import { createMockContext, mockJwtConfig } from '../../utils/mock.js';

vi.mock('../../../src/services/jwt.js', () => {
  let callCount = 0;

  return {
    initJWTKeys: vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        jwtPrivateKey: `mocked-private-key-${callCount}`,
        jwtPublicKey: `mocked-public-key-${callCount}`,
        jwtRefreshSecret: `mocked-refresh-secret-${callCount}`,
        jwtDbPrivateKey: `mocked-db-private-key-${callCount}`,
        publicKeyJWK: { kid: `test-kid-${callCount}` },
        publicKeyKid: `test-kid-${callCount}`,
      };
    }),
    createJWTConfigs: vi.fn().mockImplementation((keys) => {
      return {
        access: {
          expiration: MOCK_JWT_CONFIGS.access.expiration,
          algorithm: MOCK_JWT_CONFIGS.access.algorithm,
          signingKey: keys.jwtPrivateKey,
          verificationKey: keys.jwtPublicKey,
          aud: MOCK_JWT_CONFIGS.access.aud,
          role: MOCK_JWT_CONFIGS.access.role,
          kid: keys.publicKeyKid,
          cookieName: MOCK_JWT_CONFIGS.access.cookieName,
        },
        refresh: {
          expiration: MOCK_JWT_CONFIGS.refresh.expiration,
          algorithm: MOCK_JWT_CONFIGS.refresh.algorithm,
          signingKey: keys.jwtRefreshSecret,
          verificationKey: keys.jwtRefreshSecret,
          aud: MOCK_JWT_CONFIGS.refresh.aud,
          role: MOCK_JWT_CONFIGS.refresh.role,
          kid: MOCK_JWT_CONFIGS.refresh.kid,
          cookieName: MOCK_JWT_CONFIGS.refresh.cookieName,
        },
        db_access: {
          expiration: MOCK_JWT_CONFIGS.db_access.expiration,
          algorithm: MOCK_JWT_CONFIGS.db_access.algorithm,
          signingKey: keys.jwtDbPrivateKey,
          verificationKey: keys.jwtDbPrivateKey,
          aud: MOCK_JWT_CONFIGS.db_access.aud,
          role: MOCK_JWT_CONFIGS.db_access.role,
          kid: MOCK_JWT_CONFIGS.db_access.kid,
          cookieName: MOCK_JWT_CONFIGS.db_access.cookieName,
        },
      };
    }),
    signJWT: vi.fn().mockResolvedValue('mocked-token'),
    signJWTWithPayload: vi.fn().mockResolvedValue({
      token: 'mocked-token',
      payload: { sub: 'test-user-id' },
    }),
    verifyJWT: vi.fn().mockResolvedValue({ sub: 'test-user-id' }),
    getCookieConfig: vi.fn().mockReturnValue({
      name: 'access_token',
      options: { maxAge: 900 },
    }),
    setJWTCookie: vi.fn(),
  };
});

const { createJWTService, resetJWTCache } = await import(
  '../../../src/services/jwt.service.js'
);

describe('JWT Service', () => {
  beforeEach(() => {
    resetJWTCache();
  });

  describe('createJWTService', () => {
    it('should create a JWT service with all required methods', async () => {
      const mockContext = createMockContext({
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

      const jwtService = await createJWTService(mockContext);

      expect(jwtService).toHaveProperty('signToken');
      expect(jwtService).toHaveProperty('signTokenWithPayload');
      expect(jwtService).toHaveProperty('verifyToken');
      expect(jwtService).toHaveProperty('getCookieConfig');
      expect(jwtService).toHaveProperty('setJWTCookie');
      expect(jwtService).toHaveProperty('getJWTConfigs');
      expect(jwtService).toHaveProperty('getJWTKeys');
      expect(jwtService).toHaveProperty('getJWKS');
    });

    it('should cache JWT keys globally across multiple calls', async () => {
      const mockContext = createMockContext({
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

      const service1 = await createJWTService(mockContext);
      const service2 = await createJWTService(mockContext);

      // Keys should be the same (cached)
      const keys1 = service1.getJWTKeys();
      const keys2 = service2.getJWTKeys();
      expect(keys1).toBe(keys2);
    });
  });

  describe('resetJWTCache', () => {
    it('should reset the JWT cache and create new keys on next call', async () => {
      const mockContext = createMockContext({
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

      // Create service and get keys
      const service1 = await createJWTService(mockContext);
      const keys1 = service1.getJWTKeys();

      // Reset cache
      resetJWTCache();

      // Create new service - should have different keys due to counter in mock
      const service2 = await createJWTService(mockContext);
      const keys2 = service2.getJWTKeys();

      expect(keys1).not.toBe(keys2);
      expect(keys1.jwtPrivateKey).not.toBe(keys2.jwtPrivateKey);
    });
  });

  describe('getJWKS', () => {
    it('should return JWKS with correct structure', async () => {
      const mockContext = createMockContext({
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

      const jwtService = await createJWTService(mockContext);
      const jwks = jwtService.getJWKS();

      expect(jwks).toHaveProperty('keys');
      expect(Array.isArray(jwks.keys)).toBe(true);
      expect(jwks.keys.length).toBeGreaterThan(0);
      expect(jwks.keys[0]).toHaveProperty('kid');
      expect(jwks.keys[0]).toHaveProperty('alg');
    });
  });
});
