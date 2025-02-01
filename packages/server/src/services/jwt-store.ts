import type { Context } from 'hono';
import { env } from 'hono/adapter';

import {
  createJWTConfigs,
  initJWTKeys,
  type JWTConfigEnv,
  type JWTKeys,
  type JWTTypeConfig,
} from './auth.js';

let globalJwtKeys: JWTKeys | null = null;
let globalJwtConfigs: Record<string, JWTTypeConfig> | null = null;

function getJwtConfigFromEnv(c: Context): JWTConfigEnv {
  return {
    privateKey: env(c).JWT_PRIVATE_KEY,
    publicKey: env(c).JWT_PUBLIC_KEY,
    refreshSecret: env(c).JWT_REFRESH_SECRET,
    dbPrivateKey: env(c).JWT_DB_PRIVATE_KEY,
    accessExpiration: env(c).JWT_ACCESS_EXPIRATION,
    refreshExpiration: env(c).JWT_REFRESH_EXPIRATION,
    dbAccessExpiration: env(c).JWT_DB_ACCESS_EXPIRATION,
  };
}

export async function getOrInitJwtKeys(c: Context): Promise<JWTKeys> {
  if (globalJwtKeys) return globalJwtKeys;

  const config = getJwtConfigFromEnv(c);
  globalJwtKeys = await initJWTKeys(config);
  return globalJwtKeys;
}

export function getOrInitJwtConfigs(c: Context): Record<string, JWTTypeConfig> {
  if (globalJwtConfigs) return globalJwtConfigs;

  if (!globalJwtKeys) {
    throw new Error('JWT keys must be initialized before configs');
  }

  const config = getJwtConfigFromEnv(c);
  globalJwtConfigs = createJWTConfigs(globalJwtKeys, config);
  return globalJwtConfigs;
}

// For testing purposes
export function resetJwtStore() {
  globalJwtKeys = null;
  globalJwtConfigs = null;
}
