import { tbValidator } from '@hono/typebox-validator';
import { count, eq } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { env } from 'hono/adapter';
import { HTTPException } from 'hono/http-exception';

import { getAuth } from '../auth/runtime.js';
import {
  requireAuthSession,
  type AuthSessionVariables,
} from '../auth/session.js';
import { getDb } from '../db/db.js';
import { entry, goal } from '../db/schema.js';
import type { Env } from '../env.js';
import { applySyncTransaction } from '../services/sync.service.js';
import { uploadSyncTransactionSchema } from '../types/sync.js';

const sync = new Hono<{
  Bindings: Env;
  Variables: AuthSessionVariables;
}>();

type SyncContext = Context<{
  Bindings: Env;
  Variables: AuthSessionVariables;
}>;

sync.use('*', requireAuthSession);

function requireVerifiedAccount(c: SyncContext) {
  const authSession = c.get('authSession');
  if (!authSession.user.emailVerified) {
    throw new HTTPException(403, {
      message: 'Verify your email before enabling sync',
    });
  }
  return authSession;
}

sync.get('/credentials', async (c) => {
  requireVerifiedAccount(c);
  const { token } = await getAuth(c).api.getToken({
    headers: c.req.raw.headers,
  });

  return c.json({
    result: true as const,
    endpoint: env(c).SYNC_URL,
    token,
    // Matches the JWT plugin's configured lifetime. Supplying this lets the
    // sync SDK refresh proactively without persisting the JWT in the browser.
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
});

sync.get('/workspace', async (c) => {
  const { user } = requireVerifiedAccount(c);
  const db = getDb(env(c).DB_URL);
  const [[goalResult], [entryResult]] = await Promise.all([
    db.select({ count: count() }).from(goal).where(eq(goal.userId, user.id)),
    db.select({ count: count() }).from(entry).where(eq(entry.userId, user.id)),
  ]);
  const goalCount = goalResult?.count ?? 0;
  const entryCount = entryResult?.count ?? 0;

  return c.json({
    result: true as const,
    ownerAccountId: user.id,
    goalCount,
    entryCount,
    hasData: goalCount > 0 || entryCount > 0,
  });
});

sync.post(
  '/transactions',
  tbValidator('json', uploadSyncTransactionSchema),
  async (c) => {
    const { user } = requireVerifiedAccount(c);
    const result = await applySyncTransaction({
      db: getDb(env(c).DB_URL),
      user: { id: user.id, name: user.name, email: user.email },
      transaction: c.req.valid('json'),
    });

    return c.json(result);
  },
);

export default sync;
