import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import short from 'short-uuid';

import { SYNC_URL } from '../constants/config';
import { db } from '../db/db';
import {
  refreshToken as refreshTokensTable,
  user as usersTable,
} from '../db/schema';
import { validateAccess } from '../middlewares/auth';
import {
  comparePW,
  hashPW,
  issueRefreshToken,
  JWT,
  publicKeyJWK,
  setJWTCookie,
  validateRefreshToken,
} from '../../services/auth';
import { validateUuidV7 } from '../utils/id';

const auth = new Hono();

// TODO: error handling, rate limiting
auth.post('/signin', async (c) => {
  // TODO: validation
  // TODO: check if already signed in
  const { name, email, password } = await c.req.json();

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Invalid input');
  }

  const user = await db.query.user.findFirst({
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
      message: 'Invalid email or password',
    });
  }

  const [accessToken, refreshToken] = await Promise.all([
    JWT.sign(user.id, 'access'),
    issueRefreshToken(user.id),
  ]);

  setJWTCookie(c, 'access', accessToken);
  setJWTCookie(c, 'refresh', refreshToken);

  return c.json({
    result: true,
    // user: userInfo,
    expiresAt: Math.floor(Date.now() / 1000) + JWT.JWT_ACCESS_EXPIRATION,
  });
});

// TODO: error handling
auth.post('/signup', async (c) => {
  // TODO: validation
  const { email, name, password, uuid } = await c.req.json();
  if (
    typeof email !== 'string' ||
    typeof name !== 'string' ||
    typeof password !== 'string' ||
    typeof uuid !== 'string' ||
    !validateUuidV7(uuid)
  ) {
    throw new HTTPException(400, {
      message: 'Invalid parameters.',
    });
  }

  const existingUser = await db.query.user.findFirst({
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
  } satisfies NewUser;
  const [{ name: savedName, email: savedEmail, id, shortId }] = await db
    .insert(usersTable)
    .values(newUser)
    .returning();

  const [{ token: accessToken, payload: accessTokenPayload }, refreshToken] =
    await Promise.all([
      JWT.signWithPayload(id, 'access'),
      issueRefreshToken(id),
    ]);

  setJWTCookie(c, 'access', accessToken);
  setJWTCookie(c, 'refresh', refreshToken);

  return c.json({
    result: true,
    user: { name: savedName, email: savedEmail, id, shortId },
    expiresAt: accessTokenPayload.exp,
  });
});

auth.get('/status', validateAccess, (c) => {
  const payload = c.get('jwtAccessPayload');

  return c.json({
    result: true,
    expiresAt: payload.exp,
  });
});

auth.get('/credentials/sync', validateAccess, (c) => {
  const payload = c.get('jwtAccessPayload');
  const accessToken = c.get('jwtAccessToken');

  return c.json({
    result: true,
    token: accessToken,
    expiresAt: payload.exp,
    syncUrl: SYNC_URL,
  });
});

auth.get('/credentials/db', validateAccess, async (c) => {
  const payload = c.get('jwtAccessPayload');

  const { sub: userId } = payload;
  const dbAccessToken = await JWT.sign(userId, 'db_access');

  return c.json({
    result: true,
    token: dbAccessToken,
    expiresAt: Math.floor(Date.now() / 1000) + JWT.JWT_DB_ACCESS_EXPIRATION,
  });
});

auth.get('/refresh', async (c) => {
  const { refreshToken, refreshPayload } = await validateRefreshToken(c);

  if (!refreshToken) {
    throw new HTTPException(401, {
      message: 'Not authenticated',
    });
  }

  const newRefreshToken = await issueRefreshToken(
    refreshPayload.sub,
    refreshToken,
  );

  const { name: refreshCookieName, options: refreshCookieOptions } =
    JWT.getCookieOptions('refresh');

  setCookie(c, refreshCookieName, newRefreshToken, {
    ...refreshCookieOptions,
  });

  return c.json({
    result: true,
  });
});

auth.post('/signout', async (c) => {
  const { name: accessCookieName } = JWT.getCookieOptions('access');
  const { name: refreshCookieName } = JWT.getCookieOptions('refresh');

  const refreshToken = getCookie(c, refreshCookieName);

  if (refreshToken) {
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.token, refreshToken));
  }
  deleteCookie(c, accessCookieName);
  deleteCookie(c, refreshCookieName);

  return c.json({
    result: true,
  });
});

auth.get('/jwks', (c) => {
  const jwks = {
    keys: [
      {
        ...publicKeyJWK,
        alg: JWT.JWTConfigs.access.algorithm,
        kid: JWT.JWTConfigs.access.kid,
      },
    ],
  };

  return c.json(jwks);
});

export default auth;
