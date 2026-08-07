import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { cors } from 'hono/cors';

import type { Env } from './env.js';
import auth from './routes/auth.js';
import sync from './routes/sync.js';

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.use('/api/*', async (c, next) => {
    const allowedOrigins = (env(c).ORIGIN_URLS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const corsMiddleware = cors({
      origin: allowedOrigins,
      allowHeaders: [
        'Origin',
        'X-Requested-With',
        'User-Agent',
        'Content-Type',
        'X-Seon-Workspace-Owner-Id',
      ],
      allowMethods: ['OPTIONS', 'HEAD', 'GET', 'POST'],
      maxAge: 7200,
      credentials: true,
    });

    return corsMiddleware(c, next);
  });

  app.get('/ping', (c) => c.text('pong'));

  app.route('/api/auth', auth);
  app.route('/api/sync', sync);

  return app;
}
