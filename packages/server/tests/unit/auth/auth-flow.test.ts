import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('../../../src/db/db.js', () => dbMocks);

import { createAuth, type Auth } from '../../../src/auth/auth.js';
import { CaptureEmailSender } from '../../../src/auth/email.js';
import * as relations from '../../../src/db/relations.js';
import * as schema from '../../../src/db/schema.js';

const origin = 'https://seon.example';
const client = new PGlite();
const testDb = drizzle(client, { schema: { ...schema, ...relations } });
const emailSender = new CaptureEmailSender();
let auth: Auth;

function authRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('origin', origin);
  if (init.body) headers.set('content-type', 'application/json');
  return auth.handler(new Request(new URL(path, origin), { ...init, headers }));
}

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';', 1)[0])
    .join('; ');
}

beforeAll(async () => {
  await client.exec(`
    CREATE TABLE "user" (
      "id" uuid PRIMARY KEY,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "emailVerified" boolean NOT NULL DEFAULT false,
      "image" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE "session" (
      "id" uuid PRIMARY KEY,
      "expiresAt" timestamptz NOT NULL,
      "token" text NOT NULL UNIQUE,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "ipAddress" text,
      "userAgent" text,
      "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    );
    CREATE TABLE "account" (
      "id" uuid PRIMARY KEY,
      "accountId" text NOT NULL,
      "providerId" text NOT NULL,
      "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "accessToken" text,
      "refreshToken" text,
      "idToken" text,
      "accessTokenExpiresAt" timestamptz,
      "refreshTokenExpiresAt" timestamptz,
      "scope" text,
      "password" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE "verification" (
      "id" uuid PRIMARY KEY,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expiresAt" timestamptz NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE "jwks" (
      "id" uuid PRIMARY KEY,
      "publicKey" text NOT NULL,
      "privateKey" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "expiresAt" timestamptz
    );
    CREATE TABLE "profile" (
      "userId" uuid PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "email" text,
      "shortId" text UNIQUE,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "useSync" boolean NOT NULL DEFAULT false,
      "preferences" jsonb
    );
  `);

  dbMocks.getDb.mockReturnValue(testDb);
  auth = createAuth(
    {
      databaseUrl: 'pglite://auth-flow',
      secret: 'test-secret-that-is-at-least-32-characters',
      baseUrl: origin,
      trustedOrigins: [origin],
      powerSyncAudience: 'powersync-test',
      secureCookies: true,
      emailDelivery: 'capture',
    },
    { emailSender },
  );
});

afterAll(async () => client.close());

describe('Better Auth user flow', () => {
  it('signs up, verifies email, creates a session, and issues a PowerSync JWT', async () => {
    const signup = await authRequest('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Luca',
        email: 'luca@example.com',
        password: 'correct-horse-battery-staple',
        callbackURL: `${origin}/verify-email`,
      }),
    });

    expect(signup.status).toBe(200);
    const signupBody = (await signup.json()) as {
      user: { id: string; emailVerified: boolean };
    };
    expect(signupBody.user).toMatchObject({
      emailVerified: false,
    });
    expect(signupBody.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(emailSender.messages).toHaveLength(1);

    const verificationUrl =
      emailSender.messages[0]?.text.match(/https:\/\/\S+/)?.[0];
    expect(verificationUrl).toBeTruthy();
    const verification = await authRequest(String(verificationUrl));
    expect(verification.status).toBe(302);
    const cookies = cookieHeader(verification);
    expect(cookies).toContain('seon.session_token=');

    const session = await authRequest('/api/auth/get-session', {
      headers: { cookie: cookies },
    });
    expect(session.status).toBe(200);
    await expect(session.json()).resolves.toMatchObject({
      user: {
        id: signupBody.user.id,
        email: 'luca@example.com',
        emailVerified: true,
      },
    });

    // In production the Pages proxy calls the Fly origin while Better Auth's
    // public base URL remains the browser-visible web origin.
    const proxiedSession = await auth.handler(
      new Request('https://seon-server.fly.dev/api/auth/get-session', {
        headers: {
          cookie: cookies,
          origin,
          'x-forwarded-host': 'seon.example',
          'x-forwarded-proto': 'https',
        },
      }),
    );
    expect(proxiedSession.status).toBe(200);
    await expect(proxiedSession.json()).resolves.toMatchObject({
      user: { id: signupBody.user.id },
    });

    const tokenResponse = await authRequest('/api/auth/token', {
      headers: { cookie: cookies },
    });
    expect(tokenResponse.status).toBe(404);

    const { token } = await auth.api.getToken({
      headers: new Headers({ cookie: cookies }),
    });
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString(),
    ) as Record<string, unknown>;
    expect(payload).toMatchObject({
      sub: signupBody.user.id,
      iss: origin,
      aud: 'powersync-test',
    });

    const [profile] = await testDb
      .select()
      .from(schema.profile)
      .where(eq(schema.profile.userId, signupBody.user.id));
    expect(profile).toMatchObject({
      name: 'Luca',
      email: 'luca@example.com',
    });

    const resetRequest = await authRequest('/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({
        email: 'luca@example.com',
        redirectTo: `${origin}/reset-password`,
      }),
    });
    expect(resetRequest.status).toBe(200);
    expect(emailSender.messages).toHaveLength(2);
    const resetUrl = emailSender.messages[1]?.text.match(/https:\/\/\S+/)?.[0];
    expect(resetUrl).toBeTruthy();
    const openResetLink = await authRequest(String(resetUrl));
    expect(openResetLink.status).toBe(302);
    const resetLocation = openResetLink.headers.get('location');
    const resetToken = resetLocation
      ? new URL(resetLocation, origin).searchParams.get('token')
      : null;
    expect(resetToken).toBeTruthy();

    const reset = await authRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: resetToken,
        newPassword: 'new-correct-horse-battery-staple',
      }),
    });
    expect(reset.status).toBe(200);
    expect(await testDb.select().from(schema.session)).toHaveLength(0);

    const signIn = await authRequest('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'luca@example.com',
        password: 'new-correct-horse-battery-staple',
      }),
    });
    expect(signIn.status).toBe(200);
    expect(cookieHeader(signIn)).toContain('seon.session_token=');
  });
});
