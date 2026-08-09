import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  createAuth,
  type BackgroundTaskHandler,
} from '../../../src/auth/auth.js';
import { NoopEmailSender } from '../../../src/auth/email.js';
import { createDatabase } from '../../../src/db/db.js';

const database = createDatabase('postgres://test:test@127.0.0.1:1/seon_test', {
  prepare: false,
});

afterAll(async () => database.client.end({ timeout: 0 }));

describe('Better Auth configuration', () => {
  const createTestAuth = (backgroundTaskHandler?: BackgroundTaskHandler) =>
    createAuth(
      {
        secret: 'test-secret-that-is-at-least-32-characters',
        baseUrl: 'https://seon.example',
        trustedOrigins: ['https://seon.example'],
        powerSyncAudience: 'powersync-test',
        secureCookies: true,
        emailDelivery: 'noop',
      },
      {
        db: database.db,
        emailSender: new NoopEmailSender(),
        backgroundTaskHandler,
      },
    );

  it('uses UUID database sessions and a short signed cookie cache', () => {
    const auth = createTestAuth();

    expect(auth.options.disabledPaths).toEqual(['/token']);
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

  it('delegates deferred Better Auth work to the runtime adapter', () => {
    const backgroundTaskHandler = vi.fn();
    const auth = createTestAuth(backgroundTaskHandler);

    expect(auth.options.advanced?.backgroundTasks?.handler).toBe(
      backgroundTaskHandler,
    );
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

  it('does not expose the JWT token endpoint through the public auth handler', async () => {
    const response = await createTestAuth().handler(
      new Request('https://seon.example/api/auth/token', {
        headers: { origin: 'https://seon.example' },
      }),
    );

    expect(response.status).toBe(404);
  });
});
