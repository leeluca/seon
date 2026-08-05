import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNotNull, lte, or } from 'drizzle-orm';
import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { getCookie } from 'hono/cookie';

import {
  createJWTService,
  type JWTConfigEnv,
  type JWTService,
  type JWTTokenPayload,
} from './jwt.service.js';
import { comparePW, hashPW } from './password.js';
import { COOKIE_SECURITY_SETTINGS } from '../constants/config.js';
import { getDb } from '../db/db.js';
import {
  refreshToken as refreshSessionsTable,
  user as usersTable,
} from '../db/schema.js';
import type { Env } from '../env.js';

export type { JWTConfigEnv, JWTTokenPayload };

export const REFRESH_COOKIE_NAME = 'refresh_token';

export function getRefreshCookieOptions(refreshSessionExpiration: string) {
  const maxAge = Number.parseInt(refreshSessionExpiration, 10);
  return {
    ...COOKIE_SECURITY_SETTINGS,
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  };
}

function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export interface AuthServiceDeps {
  getDatabase: (dbUrl: string) => ReturnType<typeof getDb>;
  passwordUtils: {
    hash: typeof hashPW;
    compare: typeof comparePW;
  };
  createRefreshToken: () => string;
}

const defaultDeps: AuthServiceDeps = {
  getDatabase: getDb,
  passwordUtils: {
    hash: hashPW,
    compare: comparePW,
  },
  createRefreshToken: () => randomBytes(32).toString('base64url'),
};

export interface RefreshSession {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface AuthService {
  validateCredentials: (
    email: string,
    password: string,
    dbUrl: string,
  ) => Promise<{
    isValid: boolean;
    user: typeof usersTable.$inferSelect | null;
  }>;
  hashPassword: (password: string) => Promise<string>;
  validateAccessToken: (c: Context) => Promise<{
    accessToken: string | null;
    accessPayload: JWTTokenPayload | null;
  }>;
  issueRefreshSession: (
    userId: string,
    refreshSessionExpiration: string,
  ) => Promise<RefreshSession>;
  validateRefreshSession: (c: Context) => Promise<RefreshSession | null>;
  revokeRefreshSession: (c: Context) => Promise<void>;
}

function createService(
  c: Context,
  jwtService: JWTService,
  deps: AuthServiceDeps,
): AuthService {
  const dbUrl = env<Env>(c).DB_URL;
  const getDbClient = () => deps.getDatabase(dbUrl);

  const deleteExpiredRefreshSessions = async () => {
    try {
      await getDbClient()
        .delete(refreshSessionsTable)
        .where(
          or(
            lte(refreshSessionsTable.expiresAt, new Date()),
            and(
              isNotNull(refreshSessionsTable.revokedAt),
              lte(refreshSessionsTable.revokedAt, new Date().toISOString()),
            ),
          ),
        );
    } catch (error) {
      console.error('Refresh session cleanup failed (ignored):', error);
    }
  };

  const issueRefreshSession = async (
    userId: string,
    refreshSessionExpiration: string,
  ): Promise<RefreshSession> => {
    const token = deps.createRefreshToken();
    const expiresAt = new Date(
      Date.now() + Number.parseInt(refreshSessionExpiration, 10) * 1000,
    );

    await getDbClient()
      .insert(refreshSessionsTable)
      .values({
        userId,
        tokenHash: hashRefreshToken(token),
        expiresAt,
      });

    void deleteExpiredRefreshSessions();

    return {
      token,
      userId,
      expiresAt: Math.floor(expiresAt.getTime() / 1000),
    };
  };

  const validateRefreshSession = async (context: Context) => {
    const token = getCookie(context, REFRESH_COOKIE_NAME);
    if (!token) return null;

    const rows = await getDbClient()
      .select({
        userId: refreshSessionsTable.userId,
        expiresAt: refreshSessionsTable.expiresAt,
        revokedAt: refreshSessionsTable.revokedAt,
      })
      .from(refreshSessionsTable)
      .where(eq(refreshSessionsTable.tokenHash, hashRefreshToken(token)))
      .innerJoin(usersTable, eq(refreshSessionsTable.userId, usersTable.id))
      .limit(1);
    const session = rows[0];

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }

    return {
      token,
      userId: session.userId,
      expiresAt: Math.floor(session.expiresAt.getTime() / 1000),
    };
  };

  const revokeRefreshSession = async (context: Context) => {
    const token = getCookie(context, REFRESH_COOKIE_NAME);
    if (!token) return;

    await getDbClient()
      .delete(refreshSessionsTable)
      .where(eq(refreshSessionsTable.tokenHash, hashRefreshToken(token)));
  };

  const validateCredentials = async (
    email: string,
    password: string,
    dbUrlParam: string,
  ) => {
    try {
      const user = await deps.getDatabase(dbUrlParam).query.user.findFirst({
        where: (user, { eq }) => eq(user.email, email),
      });

      if (!user) return { isValid: false, user: null };

      const isPasswordCorrect = await deps.passwordUtils.compare({
        receivedPassword: password,
        storedPassword: user.password,
      });

      return isPasswordCorrect
        ? { isValid: true, user }
        : { isValid: false, user: null };
    } catch (error) {
      console.error('Error validating credentials:', error);
      return { isValid: false, user: null };
    }
  };

  const validateAccessToken = async (context: Context) => {
    const { name } = jwtService.getCookieConfig('access');
    const accessToken = getCookie(context, name) ?? null;
    const accessPayload = accessToken
      ? await jwtService.verifyToken(accessToken, 'access')
      : null;
    return { accessToken, accessPayload };
  };

  return {
    validateCredentials,
    hashPassword: (password: string) => deps.passwordUtils.hash(password),
    validateAccessToken,
    issueRefreshSession,
    validateRefreshSession,
    revokeRefreshSession,
  };
}

export interface CreateAuthServiceOptions {
  deps?: Partial<AuthServiceDeps>;
  jwtService?: JWTService;
}

export async function createAuthService(
  c: Context,
  options?: CreateAuthServiceOptions,
): Promise<AuthService> {
  const deps: AuthServiceDeps = {
    ...defaultDeps,
    ...(options?.deps || {}),
    passwordUtils: {
      ...defaultDeps.passwordUtils,
      ...(options?.deps?.passwordUtils || {}),
    },
  };
  const jwtService = options?.jwtService ?? (await createJWTService(c));
  return createService(c, jwtService, deps);
}
