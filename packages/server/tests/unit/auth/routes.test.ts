import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../../src/app.js';
import type { Auth } from '../../../src/auth/auth.js';
import type { Database } from '../../../src/db/db.js';
import type { AppConfig } from '../../../src/env.js';

const appConfig: AppConfig = {
  authSecret: 'test-secret-that-is-at-least-32-characters',
  authBaseUrl: 'https://seon.example',
  allowedOrigins: ['https://seon.example'],
  trustedOrigins: ['https://seon.example'],
  powerSyncAudience: 'powersync-test',
  syncUrl: 'https://powersync.example',
  secureCookies: true,
  emailDelivery: 'noop',
};

describe('Better Auth Hono routes', () => {
  it('mounts the injected Better Auth handler below /api/auth', async () => {
    const handler = vi.fn(() => Response.json(null));
    const app = createApp({
      getConfig: () => appConfig,
      getRequestServices: () => ({
        auth: { handler } as unknown as Auth,
        db: {} as Database,
      }),
    });

    const response = await app.request(
      'https://seon.example/api/auth/get-session',
      { headers: { origin: 'https://seon.example' } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
    expect(handler).toHaveBeenCalledOnce();
  });
});
