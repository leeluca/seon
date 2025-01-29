import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env, getRuntimeKey } from 'hono/adapter';
import { cors } from 'hono/cors';

import auth from './routes/auth.js';

export interface Bindings {
  DB_URL: string;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  JWT_REFRESH_SECRET: string;
  JWT_DB_PRIVATE_KEY: string;
  JWT_ACCESS_EXPIRATION: string;
  JWT_REFRESH_EXPIRATION: string;
  JWT_DB_ACCESS_EXPIRATION: string;
  SYNC_URL: string;
  // allowed origins for CORS, comma separated string
  // FIXME: change name to ORIGIN_URLS to denote that many origins are allowed
  ORIGIN_URL: string;
}
if (getRuntimeKey() === 'node') {
  try {
    // console.log( process.env.ORIGIN_URL?.split(','))
  
    process.loadEnvFile();
  } catch {
    console.error('No .env file found');
  }
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', async (c, next) => {
  const corsMiddleware = cors({
    origin: env(c, 'node').ORIGIN_URL?.split(',') || '',
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
