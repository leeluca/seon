import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { Env } from '../env.js';
import type { AuthSession } from './auth.js';
import { getCurrentSession, type SessionLookupOptions } from './runtime.js';

type AuthContext = Context;

export async function requireSession(
  c: AuthContext,
  options: SessionLookupOptions = {},
): Promise<AuthSession> {
  const session = await getCurrentSession(c, options);
  if (!session) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  return session;
}

export interface AuthSessionVariables {
  authSession: AuthSession;
}

export const requireAuthSession = createMiddleware<{
  Bindings: Env;
  Variables: AuthSessionVariables;
}>(async (c, next) => {
  c.set('authSession', await requireSession(c));
  await next();
});
