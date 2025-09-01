import type { Context } from 'hono';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  createJWTConfigs,
  getCookieConfig,
  initJWTKeys,
  setJWTCookie,
  signJWT,
  signJWTWithPayload,
  verifyJWT,
  type JWTTypeConfig,
} from '../../../src/services/jwt.js';
import { TEST_USER } from '../../utils/constants.js';
import {
  createInvalidJWTConfig,
  createJWTTestData,
  type TestJWTData,
} from '../../utils/jwt-test-utils.js';

function createCookieMockContext(): Context {
  const headers = new Headers();

  return {
    req: {
      raw: new Request('https://example.com'),
      header: (name: string) => headers.get(name),
      headers,
    },
    env: () => '',
    get: (key: string) => undefined,
    set: () => {},
    var: {},
    res: {
      headers: new Headers(),
      header: (name: string, value: string) => {
        headers.set(name, value);
        return;
      },
    },
  } as unknown as Context;
}

describe('JWT Service', () => {
  let jwtTestData: TestJWTData;
  let jwtConfigs: Record<string, JWTTypeConfig>;

  beforeAll(async () => {
    jwtTestData = await createJWTTestData();
    jwtConfigs = createJWTConfigs(jwtTestData.keys, jwtTestData.config);
  });

  describe('initJWTKeys', () => {
    it('should initialize JWT keys from properly encoded config strings', async () => {
      const keys = await initJWTKeys(jwtTestData.config);

      expect(keys).toHaveProperty('jwtPrivateKey');
      expect(keys).toHaveProperty('jwtPublicKey');
      expect(keys).toHaveProperty('jwtRefreshSecret');
      expect(keys).toHaveProperty('jwtDbPrivateKey');
      expect(keys).toHaveProperty('publicKeyJWK');
      expect(keys).toHaveProperty('publicKeyKid');
    });

    it('should throw an error if keys are invalid', async () => {
      const invalidConfig = createInvalidJWTConfig();

      await expect(initJWTKeys(invalidConfig)).rejects.toThrow(
        'Failed to initialize JWT keys',
      );
    });
  });

  describe('createJWTConfigs', () => {
    it('should create JWT configs with correct values', async () => {
      expect(jwtConfigs).toHaveProperty('access');
      expect(jwtConfigs).toHaveProperty('refresh');
      expect(jwtConfigs).toHaveProperty('db_access');

      expect(jwtConfigs.access.algorithm).toBe('RS256');
      expect(jwtConfigs.refresh.algorithm).toBe('HS256');
      expect(jwtConfigs.db_access.algorithm).toBe('HS256');

      // Check that the keys were properly assigned
      expect(jwtConfigs.access.signingKey).toBe(jwtTestData.keys.jwtPrivateKey);
      expect(jwtConfigs.access.verificationKey).toBe(
        jwtTestData.keys.jwtPublicKey,
      );
      expect(jwtConfigs.refresh.signingKey).toBe(
        jwtTestData.keys.jwtRefreshSecret,
      );
      expect(jwtConfigs.db_access.signingKey).toBe(
        jwtTestData.keys.jwtDbPrivateKey,
      );
    });
  });

  describe('signJWT and verifyJWT', () => {
    it('should sign and verify a JWT token', async () => {
      const userId = TEST_USER.id;

      const token = await signJWT(userId, 'access', jwtConfigs);
      expect(token).toBeTypeOf('string');
      expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature

      const payload = await verifyJWT(token, 'access', jwtConfigs);
      expect(payload).toBeTruthy();
      expect(payload?.sub).toBe(userId);
      expect(payload?.aud).toBe('authenticated');
    });

    it('should return null for an invalid token', async () => {
      const invalidToken = 'invalid.token.format';
      const payload = await verifyJWT(invalidToken, 'access', jwtConfigs);

      expect(payload).toBeNull();
    });
  });

  describe('signJWTWithPayload', () => {
    it('should sign a JWT and return both token and payload', async () => {
      const userId = TEST_USER.id;

      const result = await signJWTWithPayload(userId, 'access', jwtConfigs);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('payload');
      expect(result.payload.sub).toBe(userId);
      expect(result.payload.aud).toBe('authenticated');
      expect(result.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

      const verifiedPayload = await verifyJWT(
        result.token,
        'access',
        jwtConfigs,
      );
      expect(verifiedPayload).toMatchObject(result.payload);
    });
  });

  describe('getCookieConfig', () => {
    it('should return the correct cookie configuration', async () => {
      const accessCookieConfig = getCookieConfig('access', jwtConfigs);

      expect(accessCookieConfig).toHaveProperty('name');
      expect(accessCookieConfig).toHaveProperty('options');
      expect(accessCookieConfig.name).toBe('access_token');
      expect(accessCookieConfig.options).toHaveProperty('maxAge');
      expect(accessCookieConfig.options.maxAge).toBe(900);
    });
  });

  describe('setJWTCookie', () => {
    it('should set a cookie with the correct name and options', async () => {
      const token = await signJWT(TEST_USER.id, 'access', jwtConfigs);

      const c = createCookieMockContext();

      vi.mock('hono/cookie', () => ({
        setCookie: vi.fn().mockImplementation((ctx, name, value, options) => {
          const cookieValue = `${name}=${value}; Max-Age=${options.maxAge}`;
          ctx.res.headers.set('Set-Cookie', cookieValue);
        }),
      }));

      setJWTCookie(c, 'access', token, jwtConfigs);

      const setCookie = c.res.headers.get('Set-Cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('access_token=');
      expect(setCookie).toContain('Max-Age=900');
    });
  });
});
