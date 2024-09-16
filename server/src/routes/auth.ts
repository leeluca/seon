import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

import { db } from '../db/db';
import { user } from '../db/schema';
import { comparePW, JWT } from '../utils/auth';
import { generateUUIDs } from '../utils/id';

const auth = new Hono();

process.loadEnvFile();
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET;

if (!JWT_SECRET || !REFRESH_JWT_SECRET) {
  throw new Error('JWT_SECRET or REFRESH_JWT_SECRET is not set');
}

// TODO: error handling
auth.post('/login', async (c) => {
  // TODO: validation

  const { email, password } = await c.req.json();

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
    JWT.sign({ userId: user.id, JWTType: 'access' }),
    JWT.sign({ userId: user.id, JWTType: 'refresh' }),
  ]);

  const { name: accessCookieName, options: accessCookieOptions } =
    JWT.getCookieOptions('access');
  const { name: refreshCookieName, options: refreshCookieOptions } =
    JWT.getCookieOptions('access');

  setCookie(c, accessCookieName, accessToken, {
    ...accessCookieOptions,
  });
  setCookie(c, refreshCookieName, refreshToken, {
    ...refreshCookieOptions,
  });

  // TODO: save refresh token to db

  return c.json({
    result: true,
    user: userInfo,
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
  type NewUser = typeof user.$inferInsert;

  const newUser: NewUser = {
    id: uuid,
    shortId: shortUuid,
    email,
    name,
    password,
  };
  const [{ name: savedName, email: savedEmail, id, shortId }] = await db
    .insert(user)
    .values(newUser)
    .returning();

  const [accessToken, refreshToken] = await Promise.all([
    JWT.sign({ userId: id, JWTType: 'access' }),
    JWT.sign({ userId: id, JWTType: 'refresh' }),
  ]);

  const { name: accessCookieName, options: accessCookieOptions } =
    JWT.getCookieOptions('access');
  const { name: refreshCookieName, options: refreshCookieOptions } =
    JWT.getCookieOptions('access');

  setCookie(c, accessCookieName, accessToken, {
    ...accessCookieOptions,
  });
  setCookie(c, refreshCookieName, refreshToken, {
    ...refreshCookieOptions,
  });

  return c.json({
    success: true,
    user: { name: savedName, email: savedEmail, id, shortId },
  });
});

auth.get('/currentUser', (c) => c.text('CurrentUser'));

auth.get('/refresh', (c) => c.text('Refresh'));

auth.delete('/logout', (c) => c.text('Logout'));

export default auth;
