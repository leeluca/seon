import { betterAuth, type Auth as BetterAuthInstance } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt } from 'better-auth/plugins';
import { v7 as uuidv7 } from 'uuid';

import { getDb } from '../db/db.js';
import * as schema from '../db/schema.js';
import {
  createEmailSender,
  type EmailDeliveryMode,
  type EmailSender,
} from './email.js';

const DAY = 60 * 60 * 24;

export interface AuthConfig {
  databaseUrl: string;
  secret: string;
  baseUrl: string;
  trustedOrigins: string[];
  powerSyncAudience: string;
  secureCookies: boolean;
  emailDelivery: EmailDeliveryMode;
  resendApiKey?: string;
  emailFrom?: string;
}

export interface AuthDependencies {
  emailSender?: EmailSender;
}

interface JwtApi {
  getToken(input: { headers: Headers }): Promise<{ token: string }>;
}

export type Auth = Omit<BetterAuthInstance, 'api'> & {
  api: BetterAuthInstance['api'] & JwtApi;
};

function emailHtml(title: string, body: string, url: string): string {
  return `<h1>${title}</h1><p>${body}</p><p><a href="${url}">${url}</a></p>`;
}

function deliverAuthEmail(
  emailSender: EmailSender,
  message: Parameters<EmailSender['send']>[0],
): void {
  // Do not make auth response timing/status depend on whether an address has a
  // mailbox or whether the provider is temporarily unavailable. On Fly.io the
  // outstanding fetch continues on the long-lived Node process.
  void emailSender.send(message).catch(() => {
    console.error('Failed to deliver an authentication email');
  });
}

async function syncProfile(
  databaseUrl: string,
  authUser: { id: string; name: string; email: string },
): Promise<void> {
  try {
    await getDb(databaseUrl)
      .insert(schema.profile)
      .values({
        userId: authUser.id,
        name: authUser.name,
        email: authUser.email,
      })
      .onConflictDoUpdate({
        target: schema.profile.userId,
        set: { name: authUser.name, email: authUser.email },
      });
  } catch {
    // App profile data must never make the identity operation appear to fail
    // after Better Auth has already committed it. A later user update or sync
    // profile PUT will repair a missing row.
    console.error('Failed to synchronize the application profile');
  }
}

export function createAuth(
  config: AuthConfig,
  dependencies: AuthDependencies = {},
): Auth {
  const emailSender =
    dependencies.emailSender ??
    createEmailSender({
      mode: config.emailDelivery,
      resendApiKey: config.resendApiKey,
      from: config.emailFrom,
    });

  return betterAuth({
    appName: 'Seon',
    secret: config.secret,
    baseURL: config.baseUrl,
    basePath: '/api/auth',
    disabledPaths: ['/token'],
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(getDb(config.databaseUrl), {
      provider: 'pg',
      schema,
      transaction: true,
    }),
    advanced: {
      database: {
        generateId: () => uuidv7(),
      },
      cookiePrefix: 'seon',
      defaultCookieAttributes: {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: config.secureCookies,
      },
    },
    session: {
      expiresIn: 90 * DAY,
      updateAge: DAY,
      cookieCache: {
        enabled: true,
        maxAge: 15 * 60,
        strategy: 'compact',
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        deliverAuthEmail(emailSender, {
          to: user.email,
          subject: 'Reset your Seon password',
          text: `Reset your Seon password: ${url}`,
          html: emailHtml(
            'Reset your password',
            'Follow this link to choose a new Seon password.',
            url,
          ),
        });
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignIn: true,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        deliverAuthEmail(emailSender, {
          to: user.email,
          subject: 'Verify your Seon email',
          text: `Verify your email for Seon: ${url}`,
          html: emailHtml(
            'Verify your email',
            'Follow this link to enable syncing for your Seon account.',
            url,
          ),
        });
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            await syncProfile(config.databaseUrl, createdUser);
          },
        },
        update: {
          after: async (updatedUser) => {
            await syncProfile(config.databaseUrl, updatedUser);
          },
        },
      },
    },
    plugins: [
      jwt({
        disableSettingJwtHeader: true,
        jwks: {
          keyPairConfig: {
            alg: 'RS256',
            modulusLength: 2048,
          },
        },
        jwt: {
          issuer: config.baseUrl,
          audience: config.powerSyncAudience,
          expirationTime: '15m',
          definePayload: () => ({}),
          getSubject: ({ user }) => user.id,
        },
      }),
    ],
  }) as unknown as Auth;
}

export type AuthSession = NonNullable<
  Awaited<ReturnType<Auth['api']['getSession']>>
>;
