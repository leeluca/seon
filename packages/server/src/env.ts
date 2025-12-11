import {
  Object as TObject,
  String as TString,
  type Static,
} from '@sinclair/typebox';

import { parseType } from './utils/validation.js';

export const envSchema = TObject({
  DB_URL: TString(),
  JWT_PRIVATE_KEY: TString(),
  JWT_PUBLIC_KEY: TString(),
  JWT_REFRESH_SECRET: TString(),
  JWT_DB_PRIVATE_KEY: TString(),
  JWT_ACCESS_EXPIRATION: TString(),
  JWT_REFRESH_EXPIRATION: TString(),
  JWT_DB_ACCESS_EXPIRATION: TString(),
  SYNC_URL: TString(),
  // Comma-separated origins for CORS.
  ORIGIN_URLS: TString(),
});

export type Env = Static<typeof envSchema>;

export function validateEnv(envConfig: Record<string, unknown>): Env {
  return parseType(envSchema, envConfig);
}
