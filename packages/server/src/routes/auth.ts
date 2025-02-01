import { tbValidator } from '@hono/typebox-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { contextStorage } from 'hono/context-storage';
import { deleteCookie, getCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import short from 'short-uuid';

import { getDb } from '../db/db.js';
import {
  refreshToken as refreshTokensTable,
  user as usersTable,
} from '../db/schema.js';
import { validateAccess } from '../middlewares/auth.js';
import {
  comparePW,
  getCookieConfig,
  hashPW,
  issueRefreshToken,
  setJWTCookie,
  signJWT,
  validateRefreshToken,
  type JWTConfigEnv,
} from '../services/auth.js';
import {
  getOrInitJwtConfigs,
  getOrInitJwtKeys,
} from '../services/jwt-store.js';
import type { AuthRouteVariables, Env } from '../types/context.js';
import { signInSchema, signUpSchema } from '../types/validation.js';
import { validateUuidV7 } from '../utils/id.js';

const auth = new Hono<{ Bindings: Env; Variables: AuthRouteVariables }>();

auth.use('*', contextStorage());

auth.use('*', async (c, next) => {
  const jwtConfigEnv: JWTConfigEnv = {
    privateKey: env(c).JWT_PRIVATE_KEY,
    publicKey: env(c).JWT_PUBLIC_KEY,
    refreshSecret: env(c).JWT_REFRESH_SECRET,
    dbPrivateKey: env(c).JWT_DB_PRIVATE_KEY,
    accessExpiration: env(c).JWT_ACCESS_EXPIRATION,
    refreshExpiration: env(c).JWT_REFRESH_EXPIRATION,
    dbAccessExpiration: env(c).JWT_DB_ACCESS_EXPIRATION,
  };

  const jwtKeys = await getOrInitJwtKeys(c);
  const jwtConfigs = getOrInitJwtConfigs(c);

  c.set('jwtConfigEnv', jwtConfigEnv);
  c.set('jwtKeys', jwtKeys);
  c.set('jwtConfigs', jwtConfigs);
  await next();
});

auth.post('/signin', tbValidator('json', signInSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const jwtConfigEnv = c.get('jwtConfigEnv');
  const jwtConfigs = c.get('jwtConfigs');

  const user = await getDb(env(c).DB_URL).query.user.findFirst({
    where: (user, { eq }) => eq(user.email, email),
  });

  const isPasswordCorrect =
    user &&
    (await comparePW({
      receivedPassword: password,
      storedPassword: user.password,
    }));

  if (!isPasswordCorrect) {
    throw new HTTPException(401, {
      message: 'Invalid credentials',
    });
  }

  const [accessToken, { token: refreshToken, payload: refreshPayload }] =
    await Promise.all([
      signJWT(user.id, 'access', jwtConfigs),
      issueRefreshToken(user.id, jwtConfigs, jwtConfigEnv),
    ]);

  setJWTCookie(c, 'access', accessToken, jwtConfigs);
  setJWTCookie(c, 'refresh', refreshToken, jwtConfigs);

  const { password: _password, status, ...returnUser } = user;
  return c.json({
    result: true,
    expiresAt: refreshPayload.exp,
    user: {
      ...returnUser,
      useSync: true,
    },
  });
});

auth.post('/signup', tbValidator('json', signUpSchema), async (c) => {
  const { email, name, password, uuid } = c.req.valid('json');
  const jwtConfigEnv = c.get('jwtConfigEnv');
  const jwtConfigs = c.get('jwtConfigs');

  if (!validateUuidV7(uuid)) {
    throw new HTTPException(400, {
      message: 'Invalid parameters.',
    });
  }

  const existingUser = await getDb(env(c).DB_URL).query.user.findFirst({
    where: (user, { eq, or }) => or(eq(user.email, email), eq(user.id, uuid)),
  });

  if (existingUser) {
    throw new HTTPException(409, {
      message: 'Invalid parameters.',
    });
  }

  const hashedPassword = await hashPW(password);
  const shortUuid = short().fromUUID(uuid);

  type NewUser = typeof usersTable.$inferInsert;

  const newUser = {
    id: uuid,
    shortId: shortUuid,
    email,
    name,
    password: hashedPassword,
    useSync: true,
  } satisfies NewUser;

  const [{ name: savedName, email: savedEmail, id, shortId }] = await getDb(
    env(c).DB_URL,
  )
    .insert(usersTable)
    .values(newUser)
    .returning();

  const [accessToken, { token: refreshToken, payload: refreshPayload }] =
    await Promise.all([
      signJWT(id, 'access', jwtConfigs),
      issueRefreshToken(id, jwtConfigs, jwtConfigEnv),
    ]);

  setJWTCookie(c, 'access', accessToken, jwtConfigs);
  setJWTCookie(c, 'refresh', refreshToken, jwtConfigs);

  return c.json({
    result: true,
    user: { name: savedName, email: savedEmail, id, shortId, useSync: true },
    expiresAt: refreshPayload.exp,
  });
});

auth.get('/status', validateAccess, (c) => {
  const payload = c.get('jwtRefreshPayload');

  return c.json({
    result: true,
    expiresAt: payload?.exp || 0,
  });
});

auth.get('/credentials/sync', validateAccess, (c) => {
  const payload = c.get('jwtAccessPayload');
  const accessToken = c.get('jwtAccessToken');
  const syncUrl = env(c).SYNC_URL;

  return c.json({
    result: true,
    token: accessToken,
    expiresAt: payload.exp,
    syncUrl,
  });
});

auth.get('/credentials/db', validateAccess, async (c) => {
  const payload = c.get('jwtAccessPayload');
  const jwtConfigs = c.get('jwtConfigs');
  const { dbAccessExpiration } = c.get('jwtConfigEnv');

  const { sub: userId } = payload;
  const dbAccessToken = await signJWT(userId, 'db_access', jwtConfigs);

  return c.json({
    result: true,
    token: dbAccessToken,
    expiresAt:
      Math.floor(Date.now() / 1000) + Number.parseInt(dbAccessExpiration, 10),
  });
});

auth.get('/refresh', async (c) => {
  const jwtConfigEnv = c.get('jwtConfigEnv');
  const jwtConfigs = c.get('jwtConfigs');
  const { refreshToken, refreshPayload } = await validateRefreshToken(
    c,
    jwtConfigs,
  );

  if (!refreshToken) {
    throw new HTTPException(401, {
      message: 'Not authenticated',
    });
  }

  const { token: newRefreshToken, payload } = await issueRefreshToken(
    refreshPayload.sub,
    jwtConfigs,
    jwtConfigEnv,
    refreshToken,
  );

  setJWTCookie(c, 'refresh', newRefreshToken, jwtConfigs);

  return c.json({
    result: true,
    expiresAt: payload.exp,
  });
});

auth.post('/signout', async (c) => {
  const jwtConfigs = c.get('jwtConfigs');
  const { name: accessCookieName } = getCookieConfig('access', jwtConfigs);
  const { name: refreshCookieName } = getCookieConfig('refresh', jwtConfigs);

  const refreshToken = getCookie(c, refreshCookieName);

  if (refreshToken) {
    await getDb(env(c).DB_URL)
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.token, refreshToken));
  }

  deleteCookie(c, accessCookieName);
  deleteCookie(c, refreshCookieName);

  return c.json({
    result: true,
  });
});

auth.get('/jwks', async (c) => {
  const jwtConfigs = c.get('jwtConfigs');
  const { publicKeyJWK } = c.get('jwtKeys');

  const jwks = {
    keys: [
      {
        ...publicKeyJWK,
        alg: jwtConfigs.access.algorithm,
        kid: jwtConfigs.access.kid,
      },
    ],
  };

  return c.json(jwks);
});

export default auth;
