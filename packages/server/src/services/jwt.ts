import { createSecretKey, randomUUID } from 'node:crypto';
import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';
import type { SignatureAlgorithm } from 'hono/utils/jwt/jwa';
import type { JWTPayload } from 'hono/utils/jwt/types';
import type { CryptoKey, JWK, KeyObject } from 'jose';
import * as jose from 'jose';

import { COOKIE_SECURITY_SETTINGS } from '../constants/config.js';

export interface JWTTokenPayload extends JWTPayload {
  sub: string;
  exp: number;
  iat: number;
  aud: string;
  jti: string;
}

export interface JWTConfigEnv {
  privateKey: string;
  publicKey: string;
  refreshSecret: string;
  dbPrivateKey: string;
  accessExpiration: string;
  refreshExpiration: string;
  dbAccessExpiration: string;
}

export interface JWTKeys {
  jwtPrivateKey: CryptoKey;
  jwtPublicKey: CryptoKey;
  jwtRefreshSecret: KeyObject;
  jwtDbPrivateKey: KeyObject;
  publicKeyJWK: JWK;
  publicKeyKid: string;
}

function processKey(key: string): string {
  // Decode from base64
  const decoded = atob(key);

  // Check if it's JSON string and parse it
  try {
    const parsed = JSON.parse(decoded);
    return parsed;
  } catch {
    // If not JSON, process as PEM
    return decoded.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();
  }
}

export async function initJWTKeys(config: JWTConfigEnv): Promise<JWTKeys> {
  try {
    const privateKeyPem = processKey(config.privateKey);
    const publicKeyPem = processKey(config.publicKey);

    const [jwtPrivateKey, jwtPublicKey] = await Promise.all([
      jose.importPKCS8(privateKeyPem, 'RS256'),
      jose.importSPKI(publicKeyPem, 'RS256'),
    ]);

    const publicKeyJWK = await jose.exportJWK(jwtPublicKey);
    const publicKeyKid = await jose.calculateJwkThumbprintUri(publicKeyJWK);

    const jwtRefreshSecret = createSecretKey(Buffer.from(config.refreshSecret));
    const jwtDbPrivateKey = createSecretKey(Buffer.from(config.dbPrivateKey));

    return {
      jwtPrivateKey,
      jwtPublicKey,
      jwtRefreshSecret,
      jwtDbPrivateKey,
      publicKeyJWK,
      publicKeyKid,
    };
  } catch (error) {
    console.error('Failed to initialize JWT keys:', error);
    throw new Error('Failed to initialize JWT keys');
  }
}

export interface JWTTypeConfig {
  expiration: number;
  algorithm: SignatureAlgorithm;
  signingKey: KeyObject;
  verificationKey: KeyObject;
  aud: string;
  role: string;
  kid: string;
  cookieName: string;
}

export function createJWTConfigs(
  keys: JWTKeys,
  config: JWTConfigEnv,
): Record<string, JWTTypeConfig> {
  const accessExpiration = Number.parseInt(config.accessExpiration, 10);
  const refreshExpiration = Number.parseInt(config.refreshExpiration, 10);
  const dbAccessExpiration = Number.parseInt(config.dbAccessExpiration, 10);

  return {
    access: {
      expiration: accessExpiration,
      algorithm: 'RS256',
      signingKey: keys.jwtPrivateKey,
      verificationKey: keys.jwtPublicKey,
      aud: 'authenticated',
      role: 'authenticated',
      kid: keys.publicKeyKid,
      cookieName: 'access_token',
    },
    refresh: {
      expiration: refreshExpiration,
      algorithm: 'HS256',
      signingKey: keys.jwtRefreshSecret,
      verificationKey: keys.jwtRefreshSecret,
      aud: '',
      role: '',
      kid: '',
      cookieName: 'refresh_token',
    },
    db_access: {
      expiration: dbAccessExpiration,
      algorithm: 'HS256',
      signingKey: keys.jwtDbPrivateKey,
      verificationKey: keys.jwtDbPrivateKey,
      aud: 'authenticated',
      role: 'authenticated',
      kid: '1',
      cookieName: 'db_access_token',
    },
  };
}

function generateTokenPayload(
  userId: string,
  config: JWTTypeConfig,
): JWTTokenPayload {
  return {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + config.expiration,
    iat: Math.floor(Date.now() / 1000),
    aud: config.aud,
    role: config.role,
    jti: randomUUID(),
  };
}

async function generateToken(
  tokenPayload: JWTTokenPayload,
  config: JWTTypeConfig,
) {
  return new jose.SignJWT(tokenPayload)
    .setProtectedHeader({
      alg: config.algorithm,
      typ: 'JWT',
      kid: config.kid,
    })
    .sign(config.signingKey);
}

export async function signJWT(
  userId: string,
  jwtType: string,
  configs: Record<string, JWTTypeConfig>,
) {
  const config = configs[jwtType];
  const tokenPayload = generateTokenPayload(userId, config);
  return generateToken(tokenPayload, config);
}

export async function signJWTWithPayload(
  userId: string,
  jwtType: string,
  configs: Record<string, JWTTypeConfig>,
) {
  const config = configs[jwtType];
  const tokenPayload = generateTokenPayload(userId, config);
  const token = await generateToken(tokenPayload, config);
  return { token, payload: tokenPayload };
}

export async function verifyJWT(
  token: string,
  jwtType: string,
  configs: Record<string, JWTTypeConfig>,
) {
  try {
    const config = configs[jwtType];
    const { payload } = await jose.jwtVerify<JWTTokenPayload>(
      token,
      config.verificationKey,
    );
    return payload;
  } catch {
    return null;
  }
}

export function getCookieConfig(
  jwtType: string,
  configs: Record<string, JWTTypeConfig>,
) {
  const config = configs[jwtType];
  return {
    name: config.cookieName,
    options: {
      ...COOKIE_SECURITY_SETTINGS,
      maxAge: config.expiration,
      expires: new Date(Date.now() + config.expiration * 1000),
    },
  };
}

export const setJWTCookie = (
  c: Context,
  tokenType: string,
  token: string,
  jwtConfigs: Record<string, JWTTypeConfig>,
) => {
  const { name: cookieName, options: cookieOptions } = getCookieConfig(
    tokenType,
    jwtConfigs,
  );
  setCookie(c, cookieName, token, {
    ...cookieOptions,
  });
};
