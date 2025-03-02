import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { getContext } from 'hono/context-storage';
import { getCookie } from 'hono/cookie';

import {
  comparePW,
  createJWTConfigs,
  getCookieConfig as getJwtCookieConfig,
  hashPW,
  initJWTKeys,
  signJWT,
  signJWTWithPayload,
  verifyJWT,
  type JWTConfigEnv,
  type JWTKeys,
  type JWTTokenPayload,
  type JWTTypeConfig,
} from './auth.js';
import { getOrInitJwtConfigs, getOrInitJwtKeys } from './jwt-store.js';
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
  },
  passwordUtils: {
    hash: hashPW,
    compare: comparePW,
  },
};

// Global cached service promise for long-lived servers
let globalAuthService: Promise<
  ReturnType<typeof createAuthServiceImplementation>
> | null = null;
let isInitializing = false;

/**
 * Create the auth service with the provided dependencies
 * @private Internal implementation
 */
function createAuthServiceImplementation(
  _jwtKeys: JWTKeys,
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
    newRefreshToken: string,
    config: JWTConfigEnv,
    oldRefreshToken?: string,
  ) => {
    const refreshExpiration = Number.parseInt(config.refreshExpiration, 10);
    const dbUrl = getContext<AuthRouteTypes>().env.DB_URL;

    try {
      const dbClient = deps.getDatabase(dbUrl);

      await dbClient.transaction(async (tx) => {
        // Only delete the specific old token if provided
        if (oldRefreshToken) {
          await tx
            .delete(refreshTokensTable)
            .where(eq(refreshTokensTable.token, oldRefreshToken));
        }

        // Insert the new token
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

  // Now create the complete service object
  return {
    verifyRefreshToken,

    /**
     * Validate a refresh token
     */
    validateRefreshToken: async (
      c: Context,
      configs: Record<string, JWTTypeConfig> = jwtConfigs,
    ) => {
      // Use the locally defined function directly
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

        // First try a simple query without joins to check if token exists
        const simpleTokenCheck = await dbClient
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

        // Now get the full user data with a join
        const savedRefreshToken = await dbClient
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
          console.log('Token exists but user validation failed');
          return { refreshToken: null, refreshPayload: null };
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
      jwtConfs: Record<string, JWTTypeConfig>,
      config: JWTConfigEnv,
      oldRefreshToken?: string,
      shouldReturnPayload: T = true as T,
    ): Promise<
      T extends true ? { token: string; payload: JWTTokenPayload } : string
    > => {
      try {
        console.log(`Generating new refresh token for user: ${userId}`);

        const { token: newRefreshToken, payload } =
          await deps.jwtUtils.signTokenWithPayload(userId, 'refresh', jwtConfs);

        console.log('Token generated, saving to database...');

        await saveNewRefreshToken(
          userId,
          newRefreshToken,
          config,
          oldRefreshToken,
        );

        console.log(`Refresh token process completed for user: ${userId}`);

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

    hashPassword: async (password: string) => {
      return deps.passwordUtils.hash(password);
    },

    getCookieConfig: (
      tokenType: string,
      configs: Record<string, JWTTypeConfig> = jwtConfigs,
    ) => {
      return deps.jwtUtils.getCookieConfig(tokenType, configs);
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
): Promise<ReturnType<typeof createAuthServiceImplementation>> {
  console.log('Initializing auth service...');

  try {
    // Get dependencies from context or JWT store
    const jwtKeys = c.get('jwtKeys') || (await getOrInitJwtKeys(c));
    const jwtConfigs = c.get('jwtConfigs') || getOrInitJwtConfigs(c);

    const authService = createAuthServiceImplementation(
      jwtKeys,
      jwtConfigs,
      customDeps,
    );

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
    console.log('Using cached auth service');
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
