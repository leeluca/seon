import type { CookieOptions } from 'hono/utils/cookie';

import { Type } from '@sinclair/typebox';

import { parseType } from '../utils/validation.js';

export const IS_DEV = process.env.NODE_ENV === 'development';

// NOTE: prevent errors when deploying
try {
  process.loadEnvFile();
} catch {
  console.error('No .env file found');
}

export const SYNC_URL = parseType(Type.String(), process.env.SYNC_URL);

const originUrlArray = process.env.ORIGIN_URL?.split(',');
export const ORIGIN_URLS = parseType(Type.Array(Type.String()), originUrlArray);

export const JWT_PRIVATE_PEM = parseType(
  Type.String(),
  process.env.JWT_PRIVATE_KEY,
);
export const JWT_PUBLIC_PEM = parseType(
  Type.String(),
  process.env.JWT_PUBLIC_KEY,
);
export const JWT_REFRESH_SECRET = parseType(
  Type.String(),
  process.env.JWT_REFRESH_SECRET,
);
export const JWT_DB_PRIVATE_KEY = parseType(
  Type.String(),
  process.env.JWT_DB_PRIVATE_KEY,
);
export const JWT_ACCESS_EXPIRATION = parseType(
  Type.String(),
  process.env.JWT_ACCESS_EXPIRATION,
);
export const JWT_REFRESH_EXPIRATION = parseType(
  Type.String(),
  process.env.JWT_REFRESH_EXPIRATION,
);
export const JWT_DB_ACCESS_EXPIRATION = parseType(
  Type.String(),
  process.env.JWT_DB_ACCESS_EXPIRATION,
);

export const COOKIE_SECURITY_SETTINGS = {
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'none' as const satisfies CookieOptions['sameSite'],
};
