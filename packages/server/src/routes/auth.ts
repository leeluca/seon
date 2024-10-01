import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

import { db } from '../db/db';
import {
  refreshToken as refreshTokensTable,
  user as usersTable,
} from '../db/schema';
import { validateAccess } from '../middlewares/auth';
import {
  comparePW,
  issueRefreshToken,
  JWT,
  validateRefreshToken,
} from '../utils/auth';
import { generateUUIDs } from '../utils/id';

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

  const userInfo = {
    id: user.id,
    shortId: user.shortId,
    name: user.name,
    email: user.email,
  };

  const [accessToken, refreshToken] = await Promise.all([
    JWT.sign(user.id, 'access'),
    JWT.sign(user.id, 'refresh'),
  ]);

  const { name: accessCookieName, options: accessCookieOptions } =
    JWT.getCookieOptions('access');
  const { name: refreshCookieName, options: refreshCookieOptions } =
    JWT.getCookieOptions('refresh');

  // TODO: if user already has a refresh token, delete it
  await db.insert(refreshTokensTable).values({
    userId: user.id,
    token: refreshToken,
    expiration: new Date(Date.now() + JWT.JWT_REFRESH_EXPIRATION * 1000),
  });

  setCookie(c, accessCookieName, accessToken, {
    ...accessCookieOptions,
  });
  setCookie(c, refreshCookieName, refreshToken, {
    ...refreshCookieOptions,
  });

  // TODO: save refresh token to db

  return c.json({
    result: true,
    // user: userInfo,
    expiresAt: Math.floor(Date.now() / 1000) + JWT.JWT_ACCESS_EXPIRATION,
  });
});

// TODO: error handling
auth.post('/signup', async (c) => {
  // TODO: validation
  const { email, name, password } = await c.req.json();
  if (
    typeof email !== 'string' ||
    typeof name !== 'string' ||
    typeof password !== 'string'
  ) {
    throw new Error('Invalid input');
  }
  const existingUser = await db.query.user.findFirst({
    where: (user, { eq, or }) => or(eq(user.email, email), eq(user.name, name)),
  });

  if (existingUser) {
    throw new HTTPException(400, {
      message: 'Already existing name or email.',
    });
  }

  const { uuid, shortUuid } = generateUUIDs();
  type NewUser = typeof usersTable.$inferInsert;

  const newUser: NewUser = {
    id: uuid,
    shortId: shortUuid,
    email,
    name,
    password,
  };
  const [{ name: savedName, email: savedEmail, id, shortId }] = await db
    .insert(usersTable)
    .values(newUser)
    .returning();

  const [accessToken, refreshToken] = await Promise.all([
    JWT.sign(id, 'access'),
    JWT.sign(id, 'refresh'),
  ]);

  const { name: accessCookieName, options: accessCookieOptions } =
    JWT.getCookieOptions('access');
  const { name: refreshCookieName, options: refreshCookieOptions } =
    JWT.getCookieOptions('refresh');

  await db.insert(refreshTokensTable).values({
    userId: id,
    token: refreshToken,
    expiration: new Date(Date.now() + JWT.JWT_REFRESH_EXPIRATION * 1000),
  });

  setCookie(c, accessCookieName, accessToken, {
    ...accessCookieOptions,
  });
  setCookie(c, refreshCookieName, refreshToken, {
    ...refreshCookieOptions,
  });

  return c.json({
    result: true,
    user: { name: savedName, email: savedEmail, id, shortId },
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
    syncUrl: JWT.JWT_ACCESS_AUDIENCE,
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

auth.delete('/logout', async (c) => {
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

export default auth;
