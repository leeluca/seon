import type { CookieOptions } from 'hono/utils/cookie';

export const COOKIE_SECURITY_SETTINGS = {
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'strict' as const satisfies CookieOptions['sameSite'],
  // TODO: add domain field
};
