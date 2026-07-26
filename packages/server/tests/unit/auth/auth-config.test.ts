import { describe, expect, it } from 'vitest';

import { createAuth } from '../../../src/auth/auth.js';
import { NoopEmailSender } from '../../../src/auth/email.js';

describe('Better Auth configuration', () => {
  const createTestAuth = () =>
    createAuth(
      {
        databaseUrl: 'postgres://test:test@127.0.0.1:1/seon_test',
        secret: 'test-secret-that-is-at-least-32-characters',
        baseUrl: 'https://seon.example',
        trustedOrigins: ['https://seon.example'],
        powerSyncAudience: 'powersync-test',
        secureCookies: true,
        emailDelivery: 'noop',
      },
      { emailSender: new NoopEmailSender() },
    );

  it('uses UUID database sessions and a short signed cookie cache', () => {
    const auth = createTestAuth();

    expect(auth.options.session).toMatchObject({
      expiresIn: 60 * 60 * 24 * 90,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 15 * 60,
        strategy: 'compact',
      },
    });
    const generateId = auth.options.advanced?.database?.generateId;
    expect(generateId).toBeTypeOf('function');
    if (typeof generateId === 'function') {
      expect(generateId({ model: 'user' })).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
    expect(auth.options.advanced?.defaultCookieAttributes).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    });
    expect(auth.options.emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
    });
    const jwtPlugin = auth.options.plugins?.find(
      (plugin) => plugin.id === 'jwt',
    );
    expect(jwtPlugin?.options).toMatchObject({
      disableSettingJwtHeader: true,
      jwks: { keyPairConfig: { alg: 'RS256', modulusLength: 2048 } },
      jwt: {
        issuer: 'https://seon.example',
        audience: 'powersync-test',
        expirationTime: '15m',
      },
    });
  });

  it('serves the Better Auth session endpoint without requiring a session', async () => {
    const response = await createTestAuth().handler(
      new Request('https://seon.example/api/auth/get-session', {
        headers: { origin: 'https://seon.example' },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
  });
});
