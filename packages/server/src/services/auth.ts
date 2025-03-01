import {
  createSecretKey,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { getContext } from 'hono/context-storage';
import { getCookie, setCookie } from 'hono/cookie';
import type { SignatureAlgorithm } from 'hono/utils/jwt/jwa';
import type { JWTPayload } from 'hono/utils/jwt/types';
import type { CryptoKey, JWK, KeyObject } from 'jose';
import * as jose from 'jose';

import { COOKIE_SECURITY_SETTINGS } from '../constants/config.js';
import { getDb } from '../db/db.js';
import {
  refreshToken as refreshTokensTable,
  user as usersTable,
} from '../db/schema.js';
import type { AuthRouteTypes } from '../types/context.js';

const scryptAsync = promisify(scrypt);

export async function hashPW(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

export async function comparePW({
  receivedPassword,
  storedPassword,
}: {
  receivedPassword: string;
  storedPassword: string;
}): Promise<boolean> {
  const [hashedPassword, salt] = storedPassword.split('.');

  const hashedPasswordBuffer = Buffer.from(hashedPassword, 'hex');

  const receivedPasswordBuffer = (await scryptAsync(
    receivedPassword,
    salt,
    64,
  )) as Buffer;

  return timingSafeEqual(hashedPasswordBuffer, receivedPasswordBuffer);
}

export interface JWTTokenPayload extends JWTPayload {
  sub: string;
  exp: number;
  iat: number;
  aud: string;
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

export const validateAccessToken = async (
  c: Context,
  jwtConfigs: Record<string, JWTTypeConfig>,
) => {
  const { name: accessCookieName } = getCookieConfig('access', jwtConfigs);
  const accessToken = getCookie(c, accessCookieName);

  const accessPayload = accessToken
    ? await verifyJWT(accessToken, 'access', jwtConfigs)
    : null;

  return { accessToken, accessPayload };
};

export const verifyRefreshToken = async (
  c: Context,
  jwtConfigs: Record<string, JWTTypeConfig>,
) => {
  const { name: refreshCookieName } = getCookieConfig('refresh', jwtConfigs);
  const refreshToken = getCookie(c, refreshCookieName);

  const refreshPayload = refreshToken
    ? await verifyJWT(refreshToken, 'refresh', jwtConfigs)
    : null;

  return { refreshToken, refreshPayload };
};

export const validateRefreshToken = async (
  c: Context,
  jwtConfigs: Record<string, JWTTypeConfig>,
) => {
  const { refreshToken, refreshPayload } = await verifyRefreshToken(
    c,
    jwtConfigs,
  );

  if (!refreshToken || !refreshPayload?.sub) {
    console.log('No valid refresh token or payload found');
    return { refreshToken: null, refreshPayload: null };
  }

  console.log(`Validating refresh token for user: ${refreshPayload.sub}`);

  try {
    // FIXME: temporary for debugging, to be removed
    // First try a simple query without joins to check if token exists
    const simpleTokenCheck = await getDb(env(c).DB_URL)
      .select()
      .from(refreshTokensTable)
      .where(eq(refreshTokensTable.token, refreshToken))
      .limit(1);

    console.log(
      `Simple token check results: ${simpleTokenCheck.length > 0 ? 'Token found' : 'Token not found'}`,
    );

    if (simpleTokenCheck.length === 0) {
      console.log('Refresh token not found in database');
      return { refreshToken: null, refreshPayload: null };
    }

    // Get the full user data with a join
    const savedRefreshToken = await getDb(env(c).DB_URL)
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.token, refreshToken),
          eq(refreshTokensTable.userId, refreshPayload.sub),
        ),
      )
      .innerJoin(usersTable, eq(refreshTokensTable.userId, usersTable.id))
      .limit(1);

    console.log(
      `Full token check with user join: ${savedRefreshToken.length > 0 ? 'Token with user found' : 'Token with user not found'}`,
    );

    if (!savedRefreshToken.length) {
      // TODO: check if user status is banned/inactive (not implemented)
      //  || savedRefreshToken[0].user.status !== 'ACTIVE'
      // Token exists but user doesn't match or user doesn't exist
      console.log('Token exists but user validation failed');
      return { refreshToken: null, refreshPayload: null };
    }

    return { refreshToken, refreshPayload };
  } catch (error) {
    console.error('Error validating refresh token:', error);
    return { refreshToken: null, refreshPayload: null };
  }
};

const saveNewRefreshToken = async (
  userId: string,
  newRefreshToken: string,
  config: JWTConfigEnv,
  oldRefreshToken?: string,
) => {
  const refreshExpiration = Number.parseInt(config.refreshExpiration, 10);
  const dbUrl = getContext<AuthRouteTypes>().env.DB_URL;

  try {
    await getDb(dbUrl).transaction(async (tx) => {
      if (oldRefreshToken) {
        await tx
          .delete(refreshTokensTable)
          .where(eq(refreshTokensTable.token, oldRefreshToken));
      }

      await tx.insert(refreshTokensTable).values({
        userId: userId,
        token: newRefreshToken,
        expiration: new Date(Date.now() + refreshExpiration * 1000),
      });
    });
    console.log(`Refresh token saved successfully for user: ${userId}`);
  } catch (error) {
    console.error('Error saving refresh token:', error);
    throw new Error('Failed to save refresh token');
  }
};

type IssueRefreshTokenReturn<T extends boolean> = T extends true
  ? {
      token: string;
      payload: JWTTokenPayload;
    }
  : string;

export const issueRefreshToken = async <T extends boolean = true>(
  userId: string,
  jwtConfigs: Record<string, JWTTypeConfig>,
  config: JWTConfigEnv,
  oldRefreshToken?: string,
  shouldReturnPayload: T = true as T,
): Promise<IssueRefreshTokenReturn<T>> => {
  try {
    console.log(`Generating new refresh token for user: ${userId}`);

    const { token: newRefreshToken, payload } = await signJWTWithPayload(
      userId,
      'refresh',
      jwtConfigs,
    );

    console.log('Token generated, saving to database...');

    await saveNewRefreshToken(userId, newRefreshToken, config, oldRefreshToken);

    console.log(`Refresh token process completed for user: ${userId}`);

    if (shouldReturnPayload) {
      return { token: newRefreshToken, payload } as IssueRefreshTokenReturn<T>;
    }
    return newRefreshToken as IssueRefreshTokenReturn<T>;
  } catch (error) {
    console.error(`Failed to issue refresh token for user ${userId}:`, error);
    throw new Error('Failed to issue refresh token');
  }
};

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
