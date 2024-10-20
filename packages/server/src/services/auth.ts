import { createSecretKey, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { SignatureAlgorithm } from 'hono/utils/jwt/jwa';
import type { JWTPayload } from 'hono/utils/jwt/types';
import type { KeyLike } from 'jose';

import { and, eq } from 'drizzle-orm';
import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { decode } from 'hono/jwt';
import * as jose from 'jose';

import {
  COOKIE_SECURITY_SETTINGS,
  JWT_ACCESS_EXPIRATION,
  JWT_DB_ACCESS_EXPIRATION,
  JWT_DB_PRIVATE_KEY,
  JWT_PRIVATE_PEM,
  JWT_PUBLIC_PEM,
  JWT_REFRESH_EXPIRATION,
  JWT_REFRESH_SECRET,
} from '../constants/config.js';
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

const [jwtPrivateKey, jwtPublicKey] = await Promise.all([
  jose.importPKCS8(JWT_PRIVATE_PEM, 'RS256', { extractable: true }),
  jose.importSPKI(JWT_PUBLIC_PEM, 'RS256', { extractable: true }),
]);
export const publicKeyJWK = await jose.exportJWK(jwtPublicKey);
export const publicKeyKid = await jose.calculateJwkThumbprintUri(publicKeyJWK);
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class JWT {
  private static JWT_REFRESH_SECRET: KeyLike;
  private static JWT_DB_PRIVATE_KEY: KeyLike;
  private static JWT_PRIVATE_KEY: KeyLike;
  private static JWT_PUBLIC_KEY: KeyLike;

  // TODO: change key name from _EXPIRATION to _DURATION(?)
  public static JWT_ACCESS_EXPIRATION: number;
  public static JWT_REFRESH_EXPIRATION: number;
  public static JWT_DB_ACCESS_EXPIRATION: number;

  static {
    this.JWT_PRIVATE_KEY = jwtPrivateKey;
    this.JWT_PUBLIC_KEY = jwtPublicKey;
    this.JWT_REFRESH_SECRET = createSecretKey(Buffer.from(JWT_REFRESH_SECRET));
    this.JWT_DB_PRIVATE_KEY = createSecretKey(Buffer.from(JWT_DB_PRIVATE_KEY));

    this.JWT_ACCESS_EXPIRATION = parseInt(JWT_ACCESS_EXPIRATION, 10);
    this.JWT_REFRESH_EXPIRATION = parseInt(JWT_REFRESH_EXPIRATION, 10);
    this.JWT_DB_ACCESS_EXPIRATION = parseInt(JWT_DB_ACCESS_EXPIRATION, 10);
  }

  private static JWT_TYPE_MAP = {
    access: {
      expiration: Math.floor(Date.now() / 1000) + this.JWT_ACCESS_EXPIRATION,
      algorithm: 'RS256' as const satisfies SignatureAlgorithm,
      signingKey: this.JWT_PRIVATE_KEY,
      verificationKey: this.JWT_PUBLIC_KEY,
      aud: 'authenticated',
      role: 'authenticated',
      kid: publicKeyKid,
      cookie: {
        name: 'access_token',
        options: {
          ...COOKIE_SECURITY_SETTINGS,
          maxAge: this.JWT_ACCESS_EXPIRATION,
          expires: new Date(Date.now() + this.JWT_ACCESS_EXPIRATION * 1000),
        },
      },
    },
    refresh: {
      expiration: Math.floor(Date.now() / 1000) + this.JWT_REFRESH_EXPIRATION,
      algorithm: 'HS256' as const satisfies SignatureAlgorithm,
      signingKey: this.JWT_REFRESH_SECRET,
      verificationKey: this.JWT_REFRESH_SECRET,
      aud: '',
      role: '',
      kid: '',
      cookie: {
        name: 'refresh_token',
        options: {
          ...COOKIE_SECURITY_SETTINGS,
          maxAge: this.JWT_REFRESH_EXPIRATION,
          expires: new Date(Date.now() + this.JWT_REFRESH_EXPIRATION * 1000),
        },
      },
    },
    db_access: {
      expiration: Math.floor(Date.now() / 1000) + this.JWT_DB_ACCESS_EXPIRATION,
      algorithm: 'HS256' as const satisfies SignatureAlgorithm,
      signingKey: this.JWT_DB_PRIVATE_KEY,
      verificationKey: this.JWT_DB_PRIVATE_KEY,
      aud: 'authenticated',
      role: 'authenticated',
      kid: '1',
      cookie: {
        name: 'db_access_token',
        options: {
          ...COOKIE_SECURITY_SETTINGS,
          maxAge: this.JWT_ACCESS_EXPIRATION,
          expires: new Date(Date.now() + this.JWT_ACCESS_EXPIRATION * 1000),
        },
      },
    },
  };

  static get JWTConfigs() {
    return this.JWT_TYPE_MAP;
  }

  private static generateTokenPayload(
    userId: string,
    JWTType: keyof typeof this.JWT_TYPE_MAP,
  ): JWTTokenPayload {
    return {
      sub: userId,
      exp: this.JWT_TYPE_MAP[JWTType].expiration,
      iat: Math.floor(Date.now() / 1000),
      aud: this.JWT_TYPE_MAP[JWTType].aud,
      role: this.JWT_TYPE_MAP[JWTType].role,
    };
  }

  private static generateToken(
    tokenPayload: JWTTokenPayload,
    JWTType: keyof typeof this.JWT_TYPE_MAP,
  ) {
    return new jose.SignJWT(tokenPayload)
      .setProtectedHeader({
        alg: this.JWT_TYPE_MAP[JWTType].algorithm,
        typ: 'JWT',
        kid: this.JWT_TYPE_MAP[JWTType].kid,
      })
      .sign(this.JWT_TYPE_MAP[JWTType].signingKey);
  }

  static sign(userId: string, JWTType: keyof typeof this.JWT_TYPE_MAP) {
    const tokenPayload = this.generateTokenPayload(userId, JWTType);
    return this.generateToken(tokenPayload, JWTType);
  }

  static async signWithPayload(
    userId: string,
    JWTType: keyof typeof this.JWT_TYPE_MAP,
  ) {
    const tokenPayload = this.generateTokenPayload(userId, JWTType);
    const token = await this.generateToken(tokenPayload, JWTType);
    return { token, payload: tokenPayload };
  }

  static async verify(token: string, JWTType: keyof typeof this.JWT_TYPE_MAP) {
    try {
      const { payload } = await jose.jwtVerify<JWTTokenPayload>(
        token,
        this.JWT_TYPE_MAP[JWTType].verificationKey,
      );
      return payload;
    } catch {
      return null;
    }
  }

  static decode(token: string) {
    return decode(token);
  }

  static getCookieOptions(JWTType: keyof typeof this.JWT_TYPE_MAP) {
    const { name, options } = this.JWT_TYPE_MAP[JWTType].cookie;
    return { name, options };
  }
}

export const validateAccessToken = async (c: Context) => {
  const { name: accessCookieName } = JWT.getCookieOptions('access');
  const accessToken = getCookie(c, accessCookieName);

  const accessPayload = accessToken
    ? await JWT.verify(accessToken, 'access')
    : null;

  return { accessToken, accessPayload };
};

export const getRefreshToken = async (c: Context) => {
  const { name: refreshCookieName } = JWT.getCookieOptions('refresh');

  const refreshToken = getCookie(c, refreshCookieName);

  const refreshPayload = refreshToken
    ? await JWT.verify(refreshToken, 'refresh')
    : null;

  return { refreshToken, refreshPayload };
};

export const validateRefreshToken = async (c: Context) => {
  const { refreshToken, refreshPayload } = await getRefreshToken(c);

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

  if (
    !savedRefreshToken.length
    // TODO: check if user status is banned/inactive (not implemented)
    //  || savedRefreshToken[0].user.status !== 'ACTIVE'
  ) {
    return { refreshToken: null, refreshPayload: null };
  }

  return { refreshToken, refreshPayload };
};

const saveNewRefreshToken = async (
  userId: string,
  newRefreshToken: string,
  oldRefreshToken?: string,
) => {
  await db.transaction(async (tx) => {
    if (oldRefreshToken) {
      await tx
        .delete(refreshTokensTable)
        .where(eq(refreshTokensTable.token, oldRefreshToken));
    }
    await tx.insert(refreshTokensTable).values({
      userId: userId,
      token: newRefreshToken,
      expiration: new Date(Date.now() + JWT.JWT_REFRESH_EXPIRATION * 1000),
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
  oldRefreshToken?: string,
  shouldReturnPayload: T = true as T,
): Promise<IssueRefreshTokenReturn<T>> => {
  const { token: newRefreshToken, payload } = await JWT.signWithPayload(
    userId,
    'refresh',
  );

  await saveNewRefreshToken(userId, newRefreshToken, oldRefreshToken);

  if (shouldReturnPayload) {
    return { token: newRefreshToken, payload } as IssueRefreshTokenReturn<T>;
  }
  return newRefreshToken as IssueRefreshTokenReturn<T>;
};

export const setJWTCookie = (
  c: Context,
  tokenType: keyof typeof JWT.JWTConfigs,
  token: string,
) => {
  const { name: cookieName, options: cookieOptions } =
    JWT.getCookieOptions(tokenType);
  setCookie(c, cookieName, token, {
    ...cookieOptions,
  });
};
