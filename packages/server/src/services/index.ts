import { and, eq, isNotNull, lte, or } from 'drizzle-orm';
import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { getContext } from 'hono/context-storage';
import { getCookie } from 'hono/cookie';

import { getOrInitJwtConfigs, getOrInitJwtKeys } from './jwt-store.js';
import {
  createJWTConfigs,
  getCookieConfig as getJwtCookieConfig,
  initJWTKeys,
  setJWTCookie,
  signJWT,
  signJWTWithPayload,
  verifyJWT,
  type JWTConfigEnv,
  type JWTKeys,
  type JWTTokenPayload,
  type JWTTypeConfig,
} from './jwt.js';
import { comparePW, hashPW } from './password.js';
import { getDb } from '../db/db.js';
import {
  refreshToken as refreshTokensTable,
  user as usersTable,
} from '../db/schema.js';
import type { AuthRouteTypes } from '../types/context.js';

export type Dependencies = {
  getDatabase: (dbUrl: string) => ReturnType<typeof getDb>;
  jwtUtils: {
    initKeys: typeof initJWTKeys;
    createConfigs: typeof createJWTConfigs;
    signToken: typeof signJWT;
    signTokenWithPayload: typeof signJWTWithPayload;
    verifyToken: typeof verifyJWT;
    getCookieConfig: typeof getJwtCookieConfig;
    setJWTCookie: typeof setJWTCookie;
  };
  passwordUtils: {
    hash: typeof hashPW;
    compare: typeof comparePW;
  };
};

const defaultDependencies: Dependencies = {
  getDatabase: getDb,
  jwtUtils: {
    initKeys: initJWTKeys,
    createConfigs: createJWTConfigs,
    signToken: signJWT,
    signTokenWithPayload: signJWTWithPayload,
    verifyToken: verifyJWT,
    getCookieConfig: getJwtCookieConfig,
    setJWTCookie: setJWTCookie,
  },
  passwordUtils: {
    hash: hashPW,
    compare: comparePW,
  },
};
const REFRESH_GRACE_TIME = 30_000; // 30 seconds

// Global cached service promise for long-lived servers
let globalAuthService: Promise<ReturnType<typeof createAuthService>> | null =
  null;
let isInitializing = false;

/**
 * Create the auth service with the provided dependencies
 * @private Internal implementation
 */
function createAuthService(
  jwtKeys: JWTKeys,
  jwtConfigs: Record<string, JWTTypeConfig>,
  customDeps: Partial<Dependencies> = {},
) {
  // Merge default and custom dependencies
  const deps: Dependencies = {
    ...defaultDependencies,
    ...customDeps,
    jwtUtils: {
      ...defaultDependencies.jwtUtils,
      ...(customDeps.jwtUtils || {}),
    },
    passwordUtils: {
      ...defaultDependencies.passwordUtils,
      ...(customDeps.passwordUtils || {}),
    },
  };

  const verifyRefreshToken = async (
    c: Context,
    configs: Record<string, JWTTypeConfig> = jwtConfigs,
  ) => {
    const { name: refreshCookieName } = deps.jwtUtils.getCookieConfig(
      'refresh',
      configs,
    );
    const refreshToken = getCookie(c, refreshCookieName);

    const refreshPayload = refreshToken
      ? await deps.jwtUtils.verifyToken(refreshToken, 'refresh', configs)
      : null;

    return { refreshToken, refreshPayload };
  };

  const saveNewRefreshToken = async (
    userId: string,
    initialRefreshToken: string,
    envConfig: JWTConfigEnv,
    oldRefreshToken?: string,
  ) => {
    const refreshExpiration = Number.parseInt(envConfig.refreshExpiration, 10);
    const dbUrl = getContext<AuthRouteTypes>().env.DB_URL;
    try {
      const dbClient = deps.getDatabase(dbUrl);

      await dbClient.transaction(async (tx) => {
        await tx.insert(refreshTokensTable).values({
          userId: userId,
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
      return;
    } catch (error) {
      console.error('Error saving refresh token:', error);
      throw new Error('Failed to save refresh token');
    }
  };

  const signTokenWithPayload = async (
    userId: string,
    jwtType: string,
    configs: Record<string, JWTTypeConfig> = jwtConfigs,
  ) => {
    return deps.jwtUtils.signTokenWithPayload(userId, jwtType, configs);
  };

  const deleteExpiredRefreshTokens = async () => {
    try {
      const dbUrl = getContext<AuthRouteTypes>().env.DB_URL;

      const dbClient = deps.getDatabase(dbUrl);
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

  return {
    verifyRefreshToken,
    signTokenWithPayload,
    /**
     * Validate a refresh token
     */
    validateRefreshToken: async (
      c: Context,
      configs: Record<string, JWTTypeConfig> = jwtConfigs,
    ) => {
      const { refreshToken, refreshPayload } = await verifyRefreshToken(
        c,
        configs,
      );

      if (!refreshToken || !refreshPayload?.sub) {
        console.log('No valid refresh token or payload found');
        return { refreshToken: null, refreshPayload: null };
      }

      console.log(`Validating refresh token for user: ${refreshPayload.sub}`);

      try {
        const dbClient = deps.getDatabase(env(c).DB_URL);

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
    },

    saveNewRefreshToken,

    issueRefreshToken: async <T extends boolean = true>(
      userId: string,
      envConfig: JWTConfigEnv,
      oldRefreshToken?: string,
      shouldReturnPayload: T = true as T,
    ): Promise<
      T extends true ? { token: string; payload: JWTTokenPayload } : string
    > => {
      try {
        const { token: newRefreshToken, payload } = await signTokenWithPayload(
          userId,
          'refresh',
        );

        await saveNewRefreshToken(
          userId,
          newRefreshToken,
          envConfig,
          oldRefreshToken,
        );

        void deleteExpiredRefreshTokens();

        if (shouldReturnPayload) {
          return { token: newRefreshToken, payload } as T extends true
            ? { token: string; payload: JWTTokenPayload }
            : string;
        }
        return newRefreshToken as T extends true
          ? { token: string; payload: JWTTokenPayload }
          : string;
      } catch (error) {
        console.error(
          `Failed to issue refresh token for user ${userId}:`,
          error,
        );
        throw new Error('Failed to issue refresh token');
      }
    },

    validateCredentials: async (
      email: string,
      password: string,
      dbUrl: string,
    ) => {
      try {
        const dbClient = deps.getDatabase(dbUrl);

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
    },

    validateAccessToken: async (
      c: Context,
      configs: Record<string, JWTTypeConfig> = jwtConfigs,
    ) => {
      const { name: accessCookieName } = deps.jwtUtils.getCookieConfig(
        'access',
        configs,
      );
      const accessToken = getCookie(c, accessCookieName);

      const accessPayload = accessToken
        ? await deps.jwtUtils.verifyToken(accessToken, 'access', configs)
        : null;

      return { accessToken, accessPayload };
    },

    signToken: (
      userId: string,
      tokenType: string,
      configs: Record<string, JWTTypeConfig> = jwtConfigs,
    ) => {
      return deps.jwtUtils.signToken(userId, tokenType, configs);
    },

    hashPassword: async (password: string) => {
      return deps.passwordUtils.hash(password);
    },

    getCookieConfig: (
      tokenType: string,
      configs: Record<string, JWTTypeConfig> = jwtConfigs,
    ) => {
      return deps.jwtUtils.getCookieConfig(tokenType, configs);
    },
    setJWTCookie: (
      c: Context,
      tokenType: string,
      token: string,
      configs: Record<string, JWTTypeConfig> = jwtConfigs,
    ) => {
      return deps.jwtUtils.setJWTCookie(c, tokenType, token, configs);
    },
    getJWTConfigs: () => {
      return jwtConfigs;
    },
    getJWTKeys: () => {
      return jwtKeys;
    },
  };
}

/**
 * Initialize the auth service
 * @private Internal implementation
 */
async function initializeAuthService(
  c: Context,
  customDeps: Partial<Dependencies> = {},
): Promise<ReturnType<typeof createAuthService>> {
  console.log('Initializing auth service...');

  try {
    const jwtKeys = await getOrInitJwtKeys(c);
    const jwtConfigs = getOrInitJwtConfigs(c);

    const authService = createAuthService(jwtKeys, jwtConfigs, customDeps);

    return authService;
  } catch (error) {
    console.error('Failed to initialize auth service:', error);
    throw error;
  }
}

/**
 * Get an instance of the auth service
 * Optimized for both serverless and long-lived server environments
 */
export async function useAuthService(
  c: Context,
  customDeps: Partial<Dependencies> = {},
) {
  // For testing or custom dependencies, always create a new instance
  if (Object.keys(customDeps).length > 0) {
    console.log('Creating custom auth service instance');
    return initializeAuthService(c, customDeps);
  }

  // For long-lived servers, use the global instance if available
  if (globalAuthService) {
    return globalAuthService;
  }

  // Prevent multiple concurrent initializations (race conditions)
  if (isInitializing) {
    while (isInitializing && !globalAuthService) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    if (globalAuthService) {
      return globalAuthService;
    }
  }

  isInitializing = true;

  try {
    globalAuthService = initializeAuthService(c);

    await globalAuthService;
    return globalAuthService;
  } catch (error) {
    console.error('Failed to initialize global auth service:', error);
    globalAuthService = null;
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * For testing purposes
 */
export function resetAuthService() {
  globalAuthService = null;
  isInitializing = false;
}
