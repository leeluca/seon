import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getOrInitJwtConfigs,
  getOrInitJwtKeys,
  resetJwtStore,
} from '../../../src/services/jwt-store.js';
import { MOCK_JWT_CONFIGS, TEST_DB_URL } from '../../utils/constants.js';
import { createMockContext, mockJwtConfig } from '../../utils/mock.js';

vi.mock('../../../src/services/jwt.js', () => {
  let callCount = 0;

  return {
    initJWTKeys: vi.fn().mockImplementation(() => {
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
  };
});

describe('JWT Store Service', () => {
  beforeEach(() => {
    // Reset the JWT store before each test
    resetJwtStore();
  });

  describe('getOrInitJwtKeys', () => {
    it('should initialize JWT keys from context environment', async () => {
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

      const keys = await getOrInitJwtKeys(mockContext);

      expect(keys).toHaveProperty('jwtPrivateKey');
      expect(keys).toHaveProperty('jwtPublicKey');
      expect(keys).toHaveProperty('jwtRefreshSecret');
      expect(keys).toHaveProperty('jwtDbPrivateKey');
      expect(keys).toHaveProperty('publicKeyJWK');
      expect(keys).toHaveProperty('publicKeyKid');
    });

    it('should return the same keys on subsequent calls', async () => {
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

      const keys1 = await getOrInitJwtKeys(mockContext);
      const keys2 = await getOrInitJwtKeys(mockContext);

      expect(keys1).toBe(keys2); // Should be the same object reference
    });
  });

  describe('getOrInitJwtConfigs', () => {
    it('should throw an error if keys are not initialized', () => {
      const mockContext = createMockContext();

      expect(() => getOrInitJwtConfigs(mockContext)).toThrow(
        'JWT keys must be initialized before configs',
      );
    });

    it('should create JWT configs after keys are initialized', async () => {
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

      await getOrInitJwtKeys(mockContext);
      const configs = getOrInitJwtConfigs(mockContext);

      expect(configs).toHaveProperty('access');
      expect(configs).toHaveProperty('refresh');
      expect(configs).toHaveProperty('db_access');
    });

    it('should return the same configs on subsequent calls', async () => {
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

      await getOrInitJwtKeys(mockContext);
      const configs1 = getOrInitJwtConfigs(mockContext);
      const configs2 = getOrInitJwtConfigs(mockContext);

      expect(configs1).toBe(configs2); // Should be the same object reference
    });
  });

  describe('resetJwtStore', () => {
    it('should reset the JWT store', async () => {
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

      // Initialize keys and configs
      const keys1 = await getOrInitJwtKeys(mockContext);
      const configs1 = getOrInitJwtConfigs(mockContext);

      // Reset the store
      resetJwtStore();

      // Get new keys and configs
      const keys2 = await getOrInitJwtKeys(mockContext);
      const configs2 = getOrInitJwtConfigs(mockContext);

      // Should be different object references and values
      expect(keys1).not.toBe(keys2);
      expect(configs1).not.toBe(configs2);

      // Check that the values are different due to the counter in our mock
      expect(keys1.jwtPrivateKey).not.toBe(keys2.jwtPrivateKey);
      expect(configs1.access.signingKey).not.toBe(configs2.access.signingKey);
    });
  });
});
