import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAuthCache } from '../../../src/auth/runtime.js';
import { createApp } from '../../../src/app.js';

beforeEach(() => {
  vi.stubEnv('DB_URL', 'postgres://test:test@127.0.0.1:1/seon_test');
  vi.stubEnv(
    'BETTER_AUTH_SECRET',
    'test-secret-that-is-at-least-32-characters',
  );
  vi.stubEnv('BETTER_AUTH_URL', 'https://seon.example');
  vi.stubEnv('POWERSYNC_AUDIENCE', 'powersync-test');
  vi.stubEnv('SYNC_URL', 'https://powersync.example');
  vi.stubEnv('ORIGIN_URLS', 'https://seon.example');
  vi.stubEnv('AUTH_EMAIL_DELIVERY', 'noop');
});

afterEach(() => {
  resetAuthCache();
  vi.unstubAllEnvs();
});

describe('Better Auth Hono routes', () => {
  it('mounts the Better Auth handler below /api/auth', async () => {
    const response = await createApp().request(
      'https://seon.example/api/auth/get-session',
      { headers: { origin: 'https://seon.example' } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
  });
});
