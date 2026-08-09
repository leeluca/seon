import {
  Literal as TLiteral,
  Object as TObject,
  Optional as TOptional,
  String as TString,
  Union as TUnion,
  type Static,
} from '@sinclair/typebox';

import type { EmailDeliveryMode } from './auth/email.js';
import { parseType } from './utils/validation.js';

export const envSchema = TObject({
  BETTER_AUTH_SECRET: TString(),
  BETTER_AUTH_URL: TString(),
  POWERSYNC_AUDIENCE: TString(),
  SYNC_URL: TString(),
  // Comma-separated origins for CORS.
  ORIGIN_URLS: TString(),
  AUTH_EMAIL_DELIVERY: TUnion([
    TLiteral('resend'),
    TLiteral('capture'),
    TLiteral('noop'),
  ]),
  RESEND_API_KEY: TOptional(TString()),
  AUTH_EMAIL_FROM: TOptional(TString()),
});

type RawAppConfig = Static<typeof envSchema>;

export interface AppConfig {
  authSecret: string;
  authBaseUrl: string;
  allowedOrigins: string[];
  trustedOrigins: string[];
  powerSyncAudience: string;
  syncUrl: string;
  secureCookies: boolean;
  emailDelivery: EmailDeliveryMode;
  resendApiKey?: string;
  emailFrom?: string;
}

export interface NodeConfig {
  appConfig: AppConfig;
  databaseUrl: string;
}

function normalizeConfig(config: RawAppConfig): AppConfig {
  const allowedOrigins = config.ORIGIN_URLS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const authOrigin = new URL(config.BETTER_AUTH_URL).origin;
  const trustedOrigins = allowedOrigins.includes(authOrigin)
    ? allowedOrigins
    : [...allowedOrigins, authOrigin];

  return {
    authSecret: config.BETTER_AUTH_SECRET,
    authBaseUrl: config.BETTER_AUTH_URL,
    allowedOrigins,
    trustedOrigins,
    powerSyncAudience: config.POWERSYNC_AUDIENCE,
    syncUrl: config.SYNC_URL,
    secureCookies: authOrigin.startsWith('https://'),
    emailDelivery: config.AUTH_EMAIL_DELIVERY,
    resendApiKey: config.RESEND_API_KEY,
    emailFrom: config.AUTH_EMAIL_FROM,
  };
}

export function validateAppConfig(
  envConfig: Record<string, unknown>,
): AppConfig {
  return normalizeConfig(parseType(envSchema, envConfig));
}

export function validateNodeConfig(
  envConfig: Record<string, unknown>,
): NodeConfig {
  const databaseUrl = envConfig.DB_URL;
  if (typeof databaseUrl !== 'string' || !databaseUrl) {
    throw new Error('DB_URL is not configured');
  }

  return {
    appConfig: validateAppConfig(envConfig),
    databaseUrl,
  };
}
