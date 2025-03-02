import { describe, expect, it, vi } from 'vitest';

import {
  createJWTConfigs,
  getCookieConfig,
  initJWTKeys,
  signJWT,
  signJWTWithPayload,
  verifyJWT,
} from '../../../src/services/jwt.js';
import {
  MOCK_JWT_CONFIGS,
  MOCK_JWT_KEYS,
  MOCK_JWT_PAYLOAD,
  MOCK_TOKENS,
  TEST_USER,
} from '../../utils/constants.js';
import { mockJwtConfig } from '../../utils/mock.js';

// FIXME: provide valid keys to test without mocking
// Mock the entire jwt module
vi.mock('../../../src/services/jwt.js', () => {
  return {
    initJWTKeys: vi.fn().mockImplementation(async (config) => {
      if (config.privateKey === 'invalid-key') {
        throw new Error('Failed to initialize JWT keys');
      }
      return { ...MOCK_JWT_KEYS };
    }),
    createJWTConfigs: vi
      .fn()
      .mockImplementation(() => ({ ...MOCK_JWT_CONFIGS })),
    signJWT: vi.fn().mockImplementation(() => 'mocked-jwt-token'),
    signJWTWithPayload: vi.fn().mockImplementation(() => ({
      token: 'mocked-jwt-token',
      payload: { ...MOCK_JWT_PAYLOAD },
    })),
    verifyJWT: vi.fn().mockImplementation((token) => {
      if (token === MOCK_TOKENS.invalid) {
        return null;
      }
      return { ...MOCK_JWT_PAYLOAD };
    }),
    getCookieConfig: vi
      .fn()
      .mockImplementation((jwtType: keyof typeof MOCK_JWT_CONFIGS) => ({
        name: MOCK_JWT_CONFIGS[jwtType].cookieName,
        options: {
          maxAge: MOCK_JWT_CONFIGS[jwtType].expiration,
          expires: new Date(
            Date.now() + MOCK_JWT_CONFIGS[jwtType].expiration * 1000,
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
      const userId = TEST_USER.id;
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

      const invalidToken = MOCK_TOKENS.invalid;
      const payload = await verifyJWT(invalidToken, 'access', configs);

      expect(payload).toBeNull();
    });
  });

  describe('signJWTWithPayload', () => {
    it('should sign a JWT and return both token and payload', async () => {
      const userId = TEST_USER.id;
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
      expect(accessCookieConfig.name).toBe(MOCK_JWT_CONFIGS.access.cookieName);
      expect(accessCookieConfig.options).toHaveProperty('maxAge');
    });
  });
});
