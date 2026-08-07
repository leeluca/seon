import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('../../../src/auth/auth.js', () => ({
  createAuth: () => ({ api: { getSession: getSessionMock } }),
}));

const { getCurrentSession, resetAuthCache } = await import(
  '../../../src/auth/runtime.js'
);

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
  getSessionMock.mockReset();
});

afterEach(() => {
  resetAuthCache();
  vi.unstubAllEnvs();
});

describe('getCurrentSession', () => {
  it('forwards refreshed session cookies to the protected route response', async () => {
    getSessionMock.mockResolvedValue({
      headers: new Headers({
        'set-cookie': 'seon.session_data=refreshed; Path=/; HttpOnly',
      }),
      response: {
        user: { id: '0198f091-6bf3-7236-a622-23190e33a19f' },
        session: { id: '0198f091-a184-739f-bf7f-872e45afad7a' },
      },
    });

    const app = new Hono();
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
