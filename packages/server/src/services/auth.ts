import {
  createSecretKey,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { SignatureAlgorithm } from 'hono/utils/jwt/jwa';
import type { JWTPayload } from 'hono/utils/jwt/types';
import type { JWK, KeyLike } from 'jose';
import * as jose from 'jose';

import { COOKIE_SECURITY_SETTINGS } from '../constants/config.js';
import { db } from '../db/db.js';
import {
  refreshToken as refreshTokensTable,
  user as usersTable,
} from '../db/schema.js';

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

export interface JWTConfig {
  privateKey: string;
  publicKey: string;
  refreshSecret: string;
  dbPrivateKey: string;
  accessExpiration: string;
  refreshExpiration: string;
  dbAccessExpiration: string;
}

export interface JWTKeys {
  jwtPrivateKey: KeyLike;
  jwtPublicKey: KeyLike;
  jwtRefreshSecret: KeyLike;
  jwtDbPrivateKey: KeyLike;
  publicKeyJWK: JWK;
  publicKeyKid: string;
}

export async function initJWTKeys(config: JWTConfig): Promise<JWTKeys> {
  const [jwtPrivateKey, jwtPublicKey] = await Promise.all([
    jose.importPKCS8(config.privateKey, 'RS256'),
    jose.importSPKI(config.publicKey, 'RS256'),
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
}

export interface JWTTypeConfig {
  expiration: number;
  algorithm: SignatureAlgorithm;
  signingKey: KeyLike;
  verificationKey: KeyLike;
  aud: string;
  role: string;
  kid: string;
  cookieName: string;
}

export function createJWTConfigs(
  keys: JWTKeys,
  config: JWTConfig,
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
    return { refreshToken: null, refreshPayload: null };
  }

  const savedRefreshToken = await db
    .select()
    .from(refreshTokensTable)
    .limit(1)
    .where(
      and(
        eq(refreshTokensTable.token, refreshToken),
        eq(refreshTokensTable.userId, refreshPayload.sub),
      ),
    )
    .innerJoin(usersTable, eq(refreshTokensTable.userId, usersTable.id));

  if (!savedRefreshToken.length) {
    // TODO: check if user status is banned/inactive (not implemented)
    //  || savedRefreshToken[0].user.status !== 'ACTIVE'

    return { refreshToken: null, refreshPayload: null };
  }

  return { refreshToken, refreshPayload };
};

const saveNewRefreshToken = async (
  userId: string,
  newRefreshToken: string,
  config: JWTConfig,
  oldRefreshToken?: string,
) => {
  const refreshExpiration = Number.parseInt(config.refreshExpiration, 10);

  await db.transaction(async (tx) => {
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
  config: JWTConfig,
  oldRefreshToken?: string,
  shouldReturnPayload: T = true as T,
): Promise<IssueRefreshTokenReturn<T>> => {
  const { token: newRefreshToken, payload } = await signJWTWithPayload(
    userId,
    'refresh',
    jwtConfigs,
  );

  await saveNewRefreshToken(userId, newRefreshToken, config, oldRefreshToken);

  if (shouldReturnPayload) {
    return { token: newRefreshToken, payload } as IssueRefreshTokenReturn<T>;
  }
  return newRefreshToken as IssueRefreshTokenReturn<T>;
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
