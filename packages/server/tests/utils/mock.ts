import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

import type { JWTConfigEnv } from '../../src/services/jwt.js';

// FIXME: provide valid keys to test without mocking the jwt module
// Mock JWT configuration for testing
export const mockJwtConfig: JWTConfigEnv = {
  // Use simple strings for testing instead of actual keys
  privateKey: 'test-private-key',
  publicKey: 'test-public-key',
  refreshSecret: 'test-refresh-secret',
  dbPrivateKey: 'test-db-private-key',
  accessExpiration: '900',
  refreshExpiration: '604800',
  dbAccessExpiration: '900',
};

// Create a mock Hono context
export function createMockContext(
  options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    env?: Record<string, string>;
    body?: unknown;
  } = {},
): Context {
  const headers = new Headers();
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers.set(key, value);
    }
  }

  const req = new Request('https://example.com', {
    headers,
  });

  const c = {
    req: {
      raw: req,
      header: (name: string) => headers.get(name),
      headers,
      json: async () => options.body || {},
      valid: () => options.body || {},
      cookie: (_name: string) => '', // Will be overridden below
    },
    env: (key: string) => options.env?.[key] || '',
    get: (key: string) => c.var[key],
    set: (key: string, value: unknown) => {
      (c.var as Record<string, unknown>)[key] = value;
    },
    var: {} as Record<string, unknown>,
    res: {
      headers: new Headers(),
    },
    json: (data: unknown) => ({ json: () => data }),
    status: (_code: number) => c,
    text: (text: string) => ({ text: () => text }),
  } as unknown as Context;

  // Add cookie functionality
  if (options.cookies) {
    for (const [name, value] of Object.entries(options.cookies)) {
      setCookie(c, name, value);
    }
  }

  // Add getCookie functionality
  (
    c.req as unknown as { cookie: (name: string) => string | undefined }
  ).cookie = (name: string) => getCookie(c, name) || '';

  return c;
}

// Generate test user data
export const testUser = {
  id: '01HQ5GMZN7MMVFHBF6YVPFQJ4R',
  email: 'test@example.com',
  name: 'Test User',
  password: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', // hashed 'password123'
  status: 'active',
};
