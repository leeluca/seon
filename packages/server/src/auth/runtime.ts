import type { Context } from 'hono';

import type { AuthSession } from './auth.js';
import type { AppRouteTypes } from '../types/context.js';

type AuthContext = Context<AppRouteTypes>;

export interface SessionLookupOptions {
  fresh?: boolean;
}

function forwardSessionCookies(c: AuthContext, headers: Headers): void {
  const cookies = headers.getSetCookie();
  for (const cookie of cookies) {
    c.header('Set-Cookie', cookie, { append: true });
  }
}

export async function getCurrentSession(
  c: AuthContext,
  options: SessionLookupOptions = {},
): Promise<AuthSession | null> {
  const auth = c.get('services').auth;
  const result = options.fresh
    ? await auth.api.getSession({
        headers: c.req.raw.headers,
        query: { disableCookieCache: true },
        returnHeaders: true,
      })
    : await auth.api.getSession({
        headers: c.req.raw.headers,
        returnHeaders: true,
      });

  forwardSessionCookies(c, result.headers);
  return result.response;
}
