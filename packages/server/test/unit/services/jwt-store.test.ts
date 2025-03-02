import { describe, expect, it, beforeEach, vi } from 'vitest';

import {
  getOrInitJwtConfigs,
  getOrInitJwtKeys,
  resetJwtStore,
} from '../../../src/services/jwt-store.js';
import { createMockContext, mockJwtConfig } from '../../utils/mock.js';

// FIXME: provide valid keys to test without mocking
// Mock the jwt module
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
          expiration: 900,
          algorithm: 'RS256',
          signingKey: keys.jwtPrivateKey,
          verificationKey: keys.jwtPublicKey,
          aud: 'authenticated',
          role: 'authenticated',
          kid: keys.publicKeyKid,
          cookieName: 'access_token',
        },
        refresh: {
          expiration: 604800,
          algorithm: 'HS256',
          signingKey: keys.jwtRefreshSecret,
          verificationKey: keys.jwtRefreshSecret,
          aud: '',
          role: '',
          kid: '',
          cookieName: 'refresh_token',
        },
        db_access: {
          expiration: 900,
          algorithm: 'HS256',
          signingKey: keys.jwtDbPrivateKey,
          verificationKey: keys.jwtDbPrivateKey,
          aud: 'authenticated',
          role: 'authenticated',
          kid: '1',
          cookieName: 'db_access_token',
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
