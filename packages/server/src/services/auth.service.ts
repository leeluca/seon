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
import { getDb } from '../db/db.js';
import {
  refreshToken as refreshTokensTable,
  user as usersTable,
} from '../db/schema.js';
import type { Env } from '../env.js';

export type { JWTConfigEnv, JWTTokenPayload };

const REFRESH_GRACE_TIME = 30_000; // 30 seconds

export interface AuthServiceDeps {
  getDatabase: (dbUrl: string) => ReturnType<typeof getDb>;
  passwordUtils: {
    hash: typeof hashPW;
    compare: typeof comparePW;
  };
}

const defaultDeps: AuthServiceDeps = {
  getDatabase: getDb,
  passwordUtils: {
    hash: hashPW,
    compare: comparePW,
  },
};

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
  verifyRefreshToken: (c: Context) => Promise<{
    refreshToken: string | null;
    refreshPayload: JWTTokenPayload | null;
  }>;
  validateRefreshToken: (c: Context) => Promise<{
    refreshToken: string | null;
    refreshPayload: JWTTokenPayload | null;
  }>;
  issueRefreshToken: (
    userId: string,
    envConfig: JWTConfigEnv,
    oldRefreshToken?: string,
  ) => Promise<{ token: string; payload: JWTTokenPayload }>;
  saveNewRefreshToken: (
    userId: string,
    initialRefreshToken: string,
    envConfig: JWTConfigEnv,
    oldRefreshToken?: string,
  ) => Promise<void>;
}

function createService(
  c: Context,
  jwtService: JWTService,
  deps: AuthServiceDeps,
): AuthService {
  const dbUrl = env<Env>(c).DB_URL;
  const getDbClient = () => deps.getDatabase(dbUrl);

  const verifyRefreshToken = async (context: Context) => {
    const { name: refreshCookieName } = jwtService.getCookieConfig('refresh');
    const refreshToken = getCookie(context, refreshCookieName) ?? null;
    const refreshPayload = refreshToken
      ? await jwtService.verifyToken(refreshToken, 'refresh')
      : null;
    return { refreshToken, refreshPayload };
  };

  const deleteExpiredRefreshTokens = async () => {
    try {
      const dbClient = getDbClient();
      const cutoffRevoked = new Date(Date.now() - REFRESH_GRACE_TIME);
      await dbClient
        .delete(refreshTokensTable)
        .where(
          or(
            lte(refreshTokensTable.expiresAt, new Date()),
            and(
              isNotNull(refreshTokensTable.revokedAt),
              lte(refreshTokensTable.revokedAt, cutoffRevoked.toISOString()),
            ),
          ),
        );
    } catch (cleanupErr) {
      console.error('Refresh token cleanup failed (ignored):', cleanupErr);
    }
  };

  const saveNewRefreshToken = async (
    userId: string,
    initialRefreshToken: string,
    envConfig: JWTConfigEnv,
    oldRefreshToken?: string,
  ) => {
    const refreshExpiration = Number.parseInt(envConfig.refreshExpiration, 10);
    try {
      const dbClient = getDbClient();

      await dbClient.transaction(async (tx) => {
        await tx.insert(refreshTokensTable).values({
          userId,
          token: initialRefreshToken,
          expiresAt: new Date(Date.now() + refreshExpiration * 1000),
        });

        if (oldRefreshToken) {
          await tx
            .update(refreshTokensTable)
            .set({ revokedAt: new Date().toISOString() })
            .where(eq(refreshTokensTable.token, oldRefreshToken));
        }
      });
      console.log(`Refresh token saved successfully for user: ${userId}`);
    } catch (error) {
      console.error('Error saving refresh token:', error);
      throw new Error('Failed to save refresh token');
    }
  };

  const issueRefreshToken = async (
    userId: string,
    envConfig: JWTConfigEnv,
    oldRefreshToken?: string,
  ): Promise<{ token: string; payload: JWTTokenPayload }> => {
    try {
      const { token: newRefreshToken, payload } =
        await jwtService.signTokenWithPayload(userId, 'refresh');

      await saveNewRefreshToken(
        userId,
        newRefreshToken,
        envConfig,
        oldRefreshToken,
      );

      void deleteExpiredRefreshTokens();

      return { token: newRefreshToken, payload };
    } catch (error) {
      console.error(`Failed to issue refresh token for user ${userId}:`, error);
      throw new Error('Failed to issue refresh token');
    }
  };

  const validateRefreshToken = async (context: Context) => {
    const { refreshToken, refreshPayload } = await verifyRefreshToken(context);

    if (!refreshToken || !refreshPayload?.sub) {
      console.log('No valid refresh token or payload found');
      return { refreshToken: null, refreshPayload: null };
    }

    console.log(`Validating refresh token for user: ${refreshPayload.sub}`);

    try {
      const dbClient = getDbClient();

      const rows = await dbClient
        .select({
          token: refreshTokensTable.token,
          userId: refreshTokensTable.userId,
          expiresAt: refreshTokensTable.expiresAt,
          revokedAt: refreshTokensTable.revokedAt,
        })
        .from(refreshTokensTable)
        .where(
          and(
            eq(refreshTokensTable.token, refreshToken),
            eq(refreshTokensTable.userId, refreshPayload.sub),
          ),
        )
        .innerJoin(usersTable, eq(refreshTokensTable.userId, usersTable.id))
        .limit(1);

      const tokenRow = rows[0];

      console.log(
        `Full token check with user join: ${tokenRow ? 'Token with user found' : 'Token with user not found'}`,
      );

      if (!tokenRow) {
        console.log('Token exists but user validation failed');
        return { refreshToken: null, refreshPayload: null };
      }

      const now = Date.now();
      const expirationMs = tokenRow.expiresAt.getTime();
      if (expirationMs <= now) {
        console.log('Refresh token expired');
        return { refreshToken: null, refreshPayload: null };
      }

      if (tokenRow.revokedAt) {
        const revokedAtMs = new Date(tokenRow.revokedAt).getTime();
        if (revokedAtMs + REFRESH_GRACE_TIME <= now) {
          console.log('Refresh token revoked beyond grace period');
          return { refreshToken: null, refreshPayload: null };
        }
      }

      return { refreshToken, refreshPayload };
    } catch (error) {
      console.error('Error validating refresh token:', error);
      return { refreshToken: null, refreshPayload: null };
    }
  };

  const validateCredentials = async (
    email: string,
    password: string,
    dbUrlParam: string,
  ) => {
    try {
      const dbClient = deps.getDatabase(dbUrlParam);

      const user = await dbClient.query.user.findFirst({
        where: (user, { eq }) => eq(user.email, email),
      });

      if (!user) {
        return { isValid: false, user: null };
      }

      const isPasswordCorrect = await deps.passwordUtils.compare({
        receivedPassword: password,
        storedPassword: user.password,
      });

      if (!isPasswordCorrect) {
        return { isValid: false, user: null };
      }

      return { isValid: true, user };
    } catch (error) {
      console.error('Error validating credentials:', error);
      return { isValid: false, user: null };
    }
  };

  const validateAccessToken = async (context: Context) => {
    const { name: accessCookieName } = jwtService.getCookieConfig('access');
    const accessToken = getCookie(context, accessCookieName) ?? null;

    const accessPayload = accessToken
      ? await jwtService.verifyToken(accessToken, 'access')
      : null;

    return { accessToken, accessPayload };
  };

  return {
    validateCredentials,
    hashPassword: (password: string) => deps.passwordUtils.hash(password),
    validateAccessToken,
    verifyRefreshToken,
    validateRefreshToken,
    issueRefreshToken,
    saveNewRefreshToken,
  };
}

export interface CreateAuthServiceOptions {
  deps?: Partial<AuthServiceDeps>;
  jwtService?: JWTService;
}

/**
 * Create an auth service instance.
 * Services are lightweight and should be created per-request.
 */
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
