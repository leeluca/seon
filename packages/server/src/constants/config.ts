import type { CookieOptions } from 'hono/utils/cookie';

export const IS_DEV = process.env.NODE_ENV === 'development';

export const COOKIE_SECURITY_SETTINGS = {
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'none' as const satisfies CookieOptions['sameSite'],
};
