import { tbValidator } from '@hono/typebox-validator';
import { count, eq } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { requireAuthSession } from '../auth/session.js';
import { entry, goal } from '../db/schema.js';
import { applySyncTransaction } from '../services/sync.service.js';
import type { AppRouteTypes } from '../types/context.js';
import { uploadSyncTransactionSchema } from '../types/sync.js';

const sync = new Hono<AppRouteTypes>();

type SyncContext = Context<AppRouteTypes>;

export const WORKSPACE_OWNER_HEADER = 'X-Seon-Workspace-Owner-Id';

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

export function assertWorkspaceOwner(
  expectedOwnerAccountId: string | undefined,
  authenticatedAccountId: string,
): void {
  if (expectedOwnerAccountId === authenticatedAccountId) return;

  throw new HTTPException(409, {
    message: 'The authenticated account does not own this browser workspace',
  });
}

function requireWorkspaceAccount(c: SyncContext) {
  const authSession = requireVerifiedAccount(c);
  assertWorkspaceOwner(
    c.req.header(WORKSPACE_OWNER_HEADER),
    authSession.user.id,
  );
  return authSession;
}

sync.get('/credentials', async (c) => {
  requireWorkspaceAccount(c);
  const { token } = await c.get('services').auth.api.getToken({
    headers: c.req.raw.headers,
  });

  return c.json({
    result: true as const,
    endpoint: c.get('appConfig').syncUrl,
    token,
    // Matches the JWT plugin's configured lifetime. Supplying this lets the
    // sync SDK refresh proactively without persisting the JWT in the browser.
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
});

sync.get('/workspace', async (c) => {
  const { user } = requireWorkspaceAccount(c);
  const db = c.get('services').db;
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
    const { user } = requireWorkspaceAccount(c);
    const result = await applySyncTransaction({
      db: c.get('services').db,
      user: { id: user.id, name: user.name, email: user.email },
      transaction: c.req.valid('json'),
    });

    return c.json(result);
  },
);

export default sync;
