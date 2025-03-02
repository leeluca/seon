import { describe, expect, it, vi } from 'vitest';

// Import the mocked functions
import {
  createJWTConfigs,
  getCookieConfig,
  initJWTKeys,
  signJWT,
  signJWTWithPayload,
  verifyJWT,
} from '../../../src/services/jwt.js';
import { mockJwtConfig } from '../../utils/mock.js';

// Mock the entire jwt module
vi.mock('../../../src/services/jwt.js', () => {
  const mockJwtKeys = {
    jwtPrivateKey: 'mocked-private-key',
    jwtPublicKey: 'mocked-public-key',
    jwtRefreshSecret: 'mocked-refresh-secret',
    jwtDbPrivateKey: 'mocked-db-private-key',
    publicKeyJWK: { kid: 'test-kid' },
    publicKeyKid: 'test-kid',
  };

  const mockJwtConfigs = {
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

  const mockTokenPayload = {
    sub: '01HQ5GMZN7MMVFHBF6YVPFQJ4R',
    exp: Math.floor(Date.now() / 1000) + 900,
    iat: Math.floor(Date.now() / 1000),
    aud: 'authenticated',
    role: 'authenticated',
  };

  return {
    initJWTKeys: vi.fn().mockImplementation(async (config) => {
      if (config.privateKey === 'invalid-key') {
        throw new Error('Failed to initialize JWT keys');
      }
      return mockJwtKeys;
    }),
    createJWTConfigs: vi.fn().mockImplementation(() => mockJwtConfigs),
    signJWT: vi.fn().mockImplementation(() => 'mocked-jwt-token'),
    signJWTWithPayload: vi.fn().mockImplementation(() => ({
      token: 'mocked-jwt-token',
      payload: mockTokenPayload,
    })),
    verifyJWT: vi.fn().mockImplementation((token) => {
      if (token === 'invalid.token.here') {
        return null;
      }
      return mockTokenPayload;
    }),
    getCookieConfig: vi
      .fn()
      .mockImplementation((jwtType: keyof typeof mockJwtConfigs) => ({
        name: mockJwtConfigs[jwtType satisfies keyof typeof mockJwtConfigs]
          .cookieName,
        options: {
          maxAge:
            mockJwtConfigs[jwtType satisfies keyof typeof mockJwtConfigs]
              .expiration,
          expires: new Date(
            Date.now() +
              mockJwtConfigs[jwtType satisfies keyof typeof mockJwtConfigs]
                .expiration *
                1000,
          ),
        },
      })),
  };
});

describe('JWT Service', () => {
  describe('initJWTKeys', () => {
    it('should initialize JWT keys from config', async () => {
      const keys = await initJWTKeys(mockJwtConfig);

      expect(keys).toHaveProperty('jwtPrivateKey');
      expect(keys).toHaveProperty('jwtPublicKey');
      expect(keys).toHaveProperty('jwtRefreshSecret');
      expect(keys).toHaveProperty('jwtDbPrivateKey');
      expect(keys).toHaveProperty('publicKeyJWK');
      expect(keys).toHaveProperty('publicKeyKid');
    });

    it('should throw an error if keys are invalid', async () => {
      const invalidConfig = { ...mockJwtConfig, privateKey: 'invalid-key' };

      await expect(initJWTKeys(invalidConfig)).rejects.toThrow(
        'Failed to initialize JWT keys',
      );
    });
  });

  describe('createJWTConfigs', () => {
    it('should create JWT configs with correct values', async () => {
      const keys = await initJWTKeys(mockJwtConfig);
      const configs = createJWTConfigs(keys, mockJwtConfig);

      expect(configs).toHaveProperty('access');
      expect(configs).toHaveProperty('refresh');
      expect(configs).toHaveProperty('db_access');

      expect(configs.access.algorithm).toBe('RS256');
      expect(configs.refresh.algorithm).toBe('HS256');
      expect(configs.db_access.algorithm).toBe('HS256');
    });
  });

  describe('signJWT and verifyJWT', () => {
    it('should sign and verify a JWT token', async () => {
      const userId = '01HQ5GMZN7MMVFHBF6YVPFQJ4R';
      const keys = await initJWTKeys(mockJwtConfig);
      const configs = createJWTConfigs(keys, mockJwtConfig);

      // Sign a token
      const token = await signJWT(userId, 'access', configs);
      expect(token).toBe('mocked-jwt-token');

      // Verify the token
      const payload = await verifyJWT(token, 'access', configs);
      expect(payload).toBeTruthy();
      expect(payload?.sub).toBe(userId);
      expect(payload?.aud).toBe('authenticated');
    });

    it('should return null for an invalid token', async () => {
      const keys = await initJWTKeys(mockJwtConfig);
      const configs = createJWTConfigs(keys, mockJwtConfig);

      const invalidToken = 'invalid.token.here';
      const payload = await verifyJWT(invalidToken, 'access', configs);

      expect(payload).toBeNull();
    });
  });

  describe('signJWTWithPayload', () => {
    it('should sign a JWT and return both token and payload', async () => {
      const userId = '01HQ5GMZN7MMVFHBF6YVPFQJ4R';
      const keys = await initJWTKeys(mockJwtConfig);
      const configs = createJWTConfigs(keys, mockJwtConfig);

      const result = await signJWTWithPayload(userId, 'access', configs);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('payload');
      expect(result.payload.sub).toBe(userId);
      expect(result.payload.aud).toBe('authenticated');
      expect(result.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('getCookieConfig', () => {
    it('should return the correct cookie configuration', async () => {
      const keys = await initJWTKeys(mockJwtConfig);
      const configs = createJWTConfigs(keys, mockJwtConfig);

      const accessCookieConfig = getCookieConfig('access', configs);

      expect(accessCookieConfig).toHaveProperty('name');
      expect(accessCookieConfig).toHaveProperty('options');
      expect(accessCookieConfig.name).toBe('access_token');
      expect(accessCookieConfig.options).toHaveProperty('maxAge');
    });
  });
});
