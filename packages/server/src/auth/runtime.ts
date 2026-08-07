import type { Context } from 'hono';
import { env } from 'hono/adapter';

import type { Env } from '../env.js';
import {
  createAuth,
  type Auth,
  type AuthConfig,
  type AuthSession,
} from './auth.js';
import type { EmailDeliveryMode } from './email.js';

type AuthContext = Context;

let cachedAuth: { key: string; auth: Auth } | undefined;

function requireValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function emailDeliveryMode(bindings: Env): EmailDeliveryMode {
  if (bindings.AUTH_EMAIL_DELIVERY) {
    if (!['resend', 'capture', 'noop'].includes(bindings.AUTH_EMAIL_DELIVERY)) {
      throw new Error('AUTH_EMAIL_DELIVERY is invalid');
    }
    return bindings.AUTH_EMAIL_DELIVERY;
  }
  if (bindings.RESEND_API_KEY && bindings.AUTH_EMAIL_FROM) {
    return 'resend';
  }
  return process.env.NODE_ENV === 'production' ? 'resend' : 'capture';
}

export function getAuthConfig(c: AuthContext): AuthConfig {
  const bindings = env<Env>(c);
  const baseUrl = requireValue(bindings.BETTER_AUTH_URL, 'BETTER_AUTH_URL');
  const trustedOrigins = requireValue(bindings.ORIGIN_URLS, 'ORIGIN_URLS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const authOrigin = new URL(baseUrl).origin;
  if (!trustedOrigins.includes(authOrigin)) {
    trustedOrigins.push(authOrigin);
  }

  return {
    databaseUrl: requireValue(bindings.DB_URL, 'DB_URL'),
    secret: requireValue(bindings.BETTER_AUTH_SECRET, 'BETTER_AUTH_SECRET'),
    baseUrl,
    trustedOrigins,
    powerSyncAudience: requireValue(
      bindings.POWERSYNC_AUDIENCE,
      'POWERSYNC_AUDIENCE',
    ),
    secureCookies: authOrigin.startsWith('https://'),
    emailDelivery: emailDeliveryMode(bindings),
    resendApiKey: bindings.RESEND_API_KEY,
    emailFrom: bindings.AUTH_EMAIL_FROM,
  };
}

export function getAuth(c: AuthContext): Auth {
  const config = getAuthConfig(c);
  const key = JSON.stringify(config);

  if (!cachedAuth || cachedAuth.key !== key) {
    cachedAuth = { key, auth: createAuth(config) };
  }

  return cachedAuth.auth;
}

export function resetAuthCache(): void {
  cachedAuth = undefined;
}

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
  const auth = getAuth(c);
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
