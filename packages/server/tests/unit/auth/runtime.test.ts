import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Auth } from '../../../src/auth/auth.js';
import { getCurrentSession } from '../../../src/auth/runtime.js';
import type { Database } from '../../../src/db/db.js';
import type { AppRouteTypes } from '../../../src/types/context.js';

const getSessionMock = vi.fn();

beforeEach(() => {
  getSessionMock.mockReset();
});

describe('getCurrentSession', () => {
  it('uses the request services and forwards refreshed session cookies', async () => {
    getSessionMock.mockResolvedValue({
      headers: new Headers({
        'set-cookie': 'seon.session_data=refreshed; Path=/; HttpOnly',
      }),
      response: {
        user: { id: '0198f091-6bf3-7236-a622-23190e33a19f' },
        session: { id: '0198f091-a184-739f-bf7f-872e45afad7a' },
      },
    });

    const app = new Hono<AppRouteTypes>();
    app.use('*', async (c, next) => {
      c.set('services', {
        auth: {
          api: { getSession: getSessionMock },
        } as unknown as Auth,
        db: {} as Database,
      });
      await next();
    });
    app.get('/', async (c) => {
      const current = await getCurrentSession(c, { fresh: true });
      return c.json({ userId: current?.user.id });
    });

    const response = await app.request('https://seon.example/', {
      headers: { cookie: 'seon.session_token=token' },
    });

    expect(response.headers.getSetCookie()).toEqual([
      'seon.session_data=refreshed; Path=/; HttpOnly',
    ]);
    expect(getSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { disableCookieCache: true },
        returnHeaders: true,
      }),
    );
  });
});
