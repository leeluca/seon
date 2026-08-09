import { Hono } from 'hono';

import type { AppRouteTypes } from '../types/context.js';

const auth = new Hono<AppRouteTypes>();

auth.on(['GET', 'POST'], '/*', (c) =>
  c.get('services').auth.handler(c.req.raw),
);

export default auth;
