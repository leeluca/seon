import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { SignatureAlgorithm } from 'hono/utils/jwt/jwa';

import { decode, sign, verify } from 'hono/jwt';
import { JWTPayload } from 'hono/utils/jwt/types';

import { COOKIE_SECURITY_SETTINGS } from '../constants/config';

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
  kid?: string;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class JWT {
  private static JWT_PRIVATE_KEY: string;
  private static JWT_PUBLIC_KEY: string;
  private static JWT_REFRESH_SECRET: string;
  private static JWT_DB_PRIVATE_KEY: string;
  // TODO: change key name from _EXPIRATION to _DURATION(?)
  public static JWT_ACCESS_AUDIENCE: string;
  public static JWT_ACCESS_EXPIRATION: number;
  public static JWT_REFRESH_EXPIRATION: number;
  public static JWT_DB_ACCESS_EXPIRATION: number;

  static {
    process.loadEnvFile();
    this.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY as string;
    this.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY as string;
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
    this.JWT_DB_PRIVATE_KEY = process.env.JWT_DB_PRIVATE_KEY as string;
    this.JWT_ACCESS_AUDIENCE = process.env.JWT_ACCESS_AUDIENCE as string;
    this.JWT_ACCESS_EXPIRATION = parseInt(
      process.env.JWT_ACCESS_EXPIRATION as string,
      10,
    );
    this.JWT_REFRESH_EXPIRATION = parseInt(
      process.env.JWT_REFRESH_EXPIRATION as string,
      10,
    );
    this.JWT_DB_ACCESS_EXPIRATION = parseInt(
      process.env.JWT_DB_ACCESS_EXPIRATION as string,
      10,
    );
    if (
      !this.JWT_PRIVATE_KEY ||
      !this.JWT_PUBLIC_KEY ||
      !this.JWT_REFRESH_SECRET ||
      !this.JWT_ACCESS_EXPIRATION ||
      !this.JWT_REFRESH_EXPIRATION ||
      !this.JWT_DB_ACCESS_EXPIRATION ||
      !this.JWT_ACCESS_AUDIENCE ||
      !this.JWT_DB_PRIVATE_KEY
    ) {
      throw new Error('Missing JWT parameters in environment variables');
    }
  }
  private static JWT_TYPE_MAP = {
    access: {
      expiration: Math.floor(Date.now() / 1000) + this.JWT_ACCESS_EXPIRATION,
      algorithm: 'RS256' as const satisfies SignatureAlgorithm,
      signingKey: this.JWT_PRIVATE_KEY,
      verificationKey: this.JWT_PUBLIC_KEY,
      aud: 'authenticated', // powerSyncUrl
      role: this.JWT_ACCESS_AUDIENCE,
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

  private static generateTokenPayload(
    userId: string,
    JWTType: keyof typeof JWT.JWT_TYPE_MAP,
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
    JWTType: keyof typeof JWT.JWT_TYPE_MAP,
  ) {
    return sign(
      tokenPayload,
      this.JWT_TYPE_MAP[JWTType].signingKey,
      this.JWT_TYPE_MAP[JWTType].algorithm,
    );
  }

  static sign(userId: string, JWTType: keyof typeof JWT.JWT_TYPE_MAP) {
    const tokenPayload = this.generateTokenPayload(userId, JWTType);
    return this.generateToken(tokenPayload, JWTType);
  }

  static async signWithPayload(
    userId: string,
    JWTType: keyof typeof JWT.JWT_TYPE_MAP,
  ) {
    const tokenPayload = this.generateTokenPayload(userId, JWTType);
    const token = await this.generateToken(tokenPayload, JWTType);
    return { token, payload: tokenPayload };
  }

  static async verify(
    token: string,
    JWTType: keyof typeof JWT.JWT_TYPE_MAP,
  ): Promise<JWTTokenPayload | null> {
    try {
      const result = await verify(
        token,
        this.JWT_TYPE_MAP[JWTType].verificationKey,
        this.JWT_TYPE_MAP[JWTType].algorithm,
      );

      return result as JWTTokenPayload;
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
