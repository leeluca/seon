import { githubAuth } from '@hono/oauth-providers/github';
import { tbValidator } from '@hono/typebox-validator';
import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import short from 'short-uuid';

import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  SYNC_URL,
} from '../constants/config.js';
import { db } from '../db/db.js';
import {
  refreshToken as refreshTokensTable,
  user as usersTable,
} from '../db/schema.js';
import { validateAccess } from '../middlewares/auth.js';
import {
  comparePW,
  hashPW,
  issueRefreshToken,
  JWT,
  publicKeyJWK,
  setJWTCookie,
  validateRefreshToken,
} from '../services/auth.js';
import { signInSchema, signUpSchema } from '../types/validation.js';
import { generateUUIDs, validateUuidV7 } from '../utils/id.js';

const auth = new Hono();

// TODO: error handling, rate limiting
auth.post('/signin', tbValidator('json', signInSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  const user = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.email, email),
  });

  const isPasswordCorrect =
    user &&
    (await comparePW({
      receivedPassword: password,
      storedPassword: user.password || '',
    }));

  if (!isPasswordCorrect) {
    throw new HTTPException(401, {
      message: 'Invalid credentials',
    });
  }

  const [accessToken, { token: refreshToken, payload: refreshPayload }] =
    await Promise.all([
      JWT.sign(user.id, 'access'),
      issueRefreshToken(user.id),
    ]);

  setJWTCookie(c, 'access', accessToken);
  setJWTCookie(c, 'refresh', refreshToken);

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

// TODO: error handling
auth.post('/signup', tbValidator('json', signUpSchema), async (c) => {
  const { email, name, password, uuid } = c.req.valid('json');

  if (!validateUuidV7(uuid)) {
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
    useSync: true,
  } satisfies NewUser;
  const [{ name: savedName, email: savedEmail, id, shortId }] = await db
    .insert(usersTable)
    .values(newUser)
    .returning();

  const [accessToken, { token: refreshToken, payload: refreshPayload }] =
    await Promise.all([JWT.sign(id, 'access'), issueRefreshToken(id)]);

  setJWTCookie(c, 'access', accessToken);
  setJWTCookie(c, 'refresh', refreshToken);

  return c.json({
    result: true,
    user: { name: savedName, email: savedEmail, id, shortId, useSync: true },
    expiresAt: refreshPayload.exp,
  });
});

auth.get(
  '/github',
  githubAuth({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
  }),
  async (c) => {
    const token = c.get('token');
    const githubUser = c.get('user-github');

    // TODO: validation with typebox?
    if (!githubUser || !token || !githubUser.email || !githubUser.name) {
      throw new HTTPException(401, {
        message: 'Not authenticated',
      });
    }

    type SavedUser = Pick<
      typeof usersTable.$inferSelect,
      'name' | 'email' | 'id' | 'shortId' | 'useSync'
    >;

    const query = sql`
    SELECT name, email, id, "shortId", "useSync"
    FROM "user"
    WHERE "user"."thirdParty"->'github'->>'id' = ${githubUser.id}
    LIMIT 1
  `;
    const result = await db.execute<SavedUser>(query);
    let savedUser = result.length ? result[0] : undefined;

    // NOTE: Create new user if not found (sign up)
    if (!savedUser) {
      type NewUser = typeof usersTable.$inferInsert;
      const { uuid, shortUuid } = generateUUIDs();
      const newUser = {
        id: uuid,
        shortId: shortUuid,
        email: githubUser.email,
        name: githubUser.name,
        useSync: true,
      } satisfies NewUser;
      const [{ name: savedName, email: savedEmail, id, shortId, useSync }] =
        await db.insert(usersTable).values(newUser).returning();
      savedUser = { name: savedName, email: savedEmail, id, shortId, useSync };
    }

    const [accessToken, { token: refreshToken, payload: refreshPayload }] =
      await Promise.all([
        JWT.sign(savedUser.id, 'access'),
        issueRefreshToken(savedUser.id),
      ]);

    setJWTCookie(c, 'access', accessToken);
    setJWTCookie(c, 'refresh', refreshToken);

    return c.json({
      result: true,
      user: savedUser,
      expiresAt: refreshPayload.exp,
    });
  },
);

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

  const { token: newRefreshToken, payload } = await issueRefreshToken(
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
    expiresAt: payload.exp,
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
