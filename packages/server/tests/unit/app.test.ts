import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { Auth } from '../../src/auth/auth.js';
import type { Database } from '../../src/db/db.js';
import type { AppConfig } from '../../src/env.js';
import type { RequestServices } from '../../src/types/context.js';

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

function fakeServices(id: number): RequestServices {
  return {
    auth: {
      handler: () => Response.json({ id }),
    } as unknown as Auth,
    db: { id } as unknown as Database,
  };
}

describe('runtime-independent app lifecycle', () => {
  it('does not create request services for health checks or CORS preflights', async () => {
    const getConfig = vi.fn(() => appConfig);
    const getRequestServices = vi.fn(() => fakeServices(1));
    const app = createApp({ getConfig, getRequestServices });

    const ping = await app.request('https://seon.example/ping');
    const preflight = await app.request(
      'https://seon.example/api/auth/get-session',
      {
        method: 'OPTIONS',
        headers: {
          origin: 'https://seon.example',
          'access-control-request-method': 'GET',
        },
      },
    );

    expect(await ping.text()).toBe('pong');
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(
      'https://seon.example',
    );
    expect(getConfig).toHaveBeenCalledOnce();
    expect(getRequestServices).not.toHaveBeenCalled();
  });

  it('can create isolated services for every Worker request', async () => {
    let id = 0;
    const created: RequestServices[] = [];
    const app = createApp({
      getConfig: () => appConfig,
      getRequestServices: () => {
        const services = fakeServices(++id);
        created.push(services);
        return services;
      },
    });

    const [first, second] = await Promise.all([
      app.request('https://seon.example/api/auth/get-session'),
      app.request('https://seon.example/api/auth/get-session'),
    ]);

    expect(await first.json()).toEqual({ id: 1 });
    expect(await second.json()).toEqual({ id: 2 });
    expect(created).toHaveLength(2);
    expect(created[0]?.auth).not.toBe(created[1]?.auth);
    expect(created[0]?.db).not.toBe(created[1]?.db);
  });

  it('can reuse one process-level service set for Node requests', async () => {
    const services = fakeServices(1);
    const provided: RequestServices[] = [];
    const app = createApp({
      getConfig: () => appConfig,
      getRequestServices: () => {
        provided.push(services);
        return services;
      },
    });

    await app.request('https://seon.example/api/auth/get-session');
    await app.request('https://seon.example/api/auth/get-session');

    expect(provided).toEqual([services, services]);
  });
});
