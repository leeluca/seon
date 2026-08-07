import {
  Literal as TLiteral,
  Object as TObject,
  Optional as TOptional,
  String as TString,
  Union as TUnion,
  type Static,
} from '@sinclair/typebox';

import { parseType } from './utils/validation.js';

export const envSchema = TObject({
  DB_URL: TString(),
  BETTER_AUTH_SECRET: TString(),
  BETTER_AUTH_URL: TString(),
  POWERSYNC_AUDIENCE: TString(),
  SYNC_URL: TString(),
  // Comma-separated origins for CORS.
  ORIGIN_URLS: TString(),
  AUTH_EMAIL_DELIVERY: TOptional(
    TUnion([TLiteral('resend'), TLiteral('capture'), TLiteral('noop')]),
  ),
  RESEND_API_KEY: TOptional(TString()),
  AUTH_EMAIL_FROM: TOptional(TString()),
});

export type Env = Static<typeof envSchema>;

export function validateEnv(envConfig: Record<string, unknown>): Env {
  return parseType(envSchema, envConfig);
}
