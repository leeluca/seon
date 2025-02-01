import { Hono } from 'hono';
import { env, getRuntimeKey } from 'hono/adapter';
import { cors } from 'hono/cors';

import auth from './routes/auth.js';
import type { Env } from './types/context.js';

if (getRuntimeKey() === 'node') {
  try {
    process.loadEnvFile();
  } catch {
    console.error('No .env file found');
  }
}

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  const corsMiddleware = cors({
    origin: env(c).ORIGIN_URL?.split(',') || '',
    allowHeaders: ['Origin', 'X-Requested-With', 'User-Agent', 'Content-Type'],
    allowMethods: ['OPTIONS', 'HEAD', 'GET', 'POST'],
    maxAge: 7200,
    credentials: true,
  });

  return corsMiddleware(c, next);
});

app.get('/', (c) => c.text('Hello world!'));

app.route('/api/auth', auth);

if (getRuntimeKey() === 'node') {
  const { serve } = await import('@hono/node-server');
  const port = 3000;

  console.log(`Server is running on port ${port}`);

  serve({
    fetch: app.fetch,
    port,
  });
}

export default {
  fetch: app.fetch,
};
