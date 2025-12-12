import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { getCookie } from 'hono/cookie';

import {
  createJWTConfigs,
  getCookieConfig,
  initJWTKeys,
  setJWTCookie as setJWTCookieUtil,
  signJWT,
  signJWTWithPayload,
  verifyJWT,
  type JWTConfigEnv,
  type JWTKeys,
  type JWTTokenPayload,
  type JWTTypeConfig,
} from './jwt.js';
import type { Env } from '../env.js';

export interface JWTService {
  signToken: (userId: string, type: keyof JWTConfigs) => Promise<string>;
  signTokenWithPayload: (
    userId: string,
    type: keyof JWTConfigs,
  ) => Promise<{ token: string; payload: JWTTokenPayload }>;
  verifyToken: (
    token: string,
    type: keyof JWTConfigs,
  ) => Promise<JWTTokenPayload | null>;
  getCookieConfig: (
    type: keyof JWTConfigs,
  ) => ReturnType<typeof getCookieConfig>;
  setJWTCookie: (c: Context, type: keyof JWTConfigs, token: string) => void;
  getJWTConfigs: () => JWTConfigs;
  getJWTKeys: () => JWTKeys;
  getJWKS: () => { keys: Array<Record<string, unknown>> };
  verifyCookieToken: (
    c: Context,
    type: keyof JWTConfigs,
  ) => Promise<JWTTokenPayload | null>;
}

type JWTConfigs = Record<string, JWTTypeConfig>;

let cachedKeys: JWTKeys | null = null;
let cachedConfigs: JWTConfigs | null = null;

function getEnvConfig(c: Context): JWTConfigEnv {
  const bindings = env<Env>(c);
  return {
    privateKey: bindings.JWT_PRIVATE_KEY,
    publicKey: bindings.JWT_PUBLIC_KEY,
    refreshSecret: bindings.JWT_REFRESH_SECRET,
    dbPrivateKey: bindings.JWT_DB_PRIVATE_KEY,
    accessExpiration: bindings.JWT_ACCESS_EXPIRATION,
    refreshExpiration: bindings.JWT_REFRESH_EXPIRATION,
    dbAccessExpiration: bindings.JWT_DB_ACCESS_EXPIRATION,
  };
}

async function getOrInitKeys(c: Context) {
  if (cachedKeys) return cachedKeys;
  cachedKeys = await initJWTKeys(getEnvConfig(c));
  return cachedKeys;
}

function getOrInitConfigs(c: Context, keys: JWTKeys) {
  if (cachedConfigs) return cachedConfigs;
  cachedConfigs = createJWTConfigs(keys, getEnvConfig(c));
  return cachedConfigs;
}

export async function createJWTService(c: Context): Promise<JWTService> {
  const keys = await getOrInitKeys(c);
  const configs = getOrInitConfigs(c, keys);

  const signToken = (userId: string, type: keyof JWTConfigs) =>
    signJWT(userId, type, configs);

  const signTokenWithPayloadWrapper = (
    userId: string,
    type: keyof JWTConfigs,
  ) => signJWTWithPayload(userId, type, configs);

  const verifyToken = (token: string, type: keyof JWTConfigs) =>
    verifyJWT(token, type, configs);

  const getCookieConfigWrapper = (type: keyof JWTConfigs) =>
    getCookieConfig(type, configs);

  const setJWTCookieWrapper = (
    context: Context,
    type: keyof JWTConfigs,
    token: string,
  ) => setJWTCookieUtil(context, type, token, configs);

  const getJWKS = () => {
    const accessConfig = configs.access;
    return {
      keys: [
        {
          ...keys.publicKeyJWK,
          alg: accessConfig.algorithm,
          kid: accessConfig.kid,
        },
      ],
    };
  };

  const verifyCookieToken = async (
    context: Context,
    type: keyof JWTConfigs,
  ) => {
    const { name } = getCookieConfigWrapper(type);
    const token = getCookie(context, name);
    if (!token) return null;
    return verifyToken(token, type);
  };

  return {
    signToken,
    signTokenWithPayload: signTokenWithPayloadWrapper,
    verifyToken,
    getCookieConfig: getCookieConfigWrapper,
    setJWTCookie: setJWTCookieWrapper,
    getJWTConfigs: () => configs,
    getJWTKeys: () => keys,
    getJWKS,
    verifyCookieToken,
  };
}

export function resetJWTCache() {
  cachedKeys = null;
  cachedConfigs = null;
}

export type { JWTConfigEnv, JWTKeys, JWTTokenPayload, JWTTypeConfig };
