import { Hono } from 'hono';

import { getAuth } from '../auth/runtime.js';
import type { Env } from '../env.js';

const auth = new Hono<{ Bindings: Env }>();

auth.on(['GET', 'POST'], '/*', (c) => getAuth(c).handler(c.req.raw));

export default auth;
