import type { ExportedHandler } from '@cloudflare/workers-types';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env, getRuntimeKey } from 'hono/adapter';
import { cors } from 'hono/cors';

import { ORIGIN_URLS } from './constants/config.js';
import auth from './routes/auth.js';

type Bindings = {
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
  ORIGIN_URLS: string;
};
if (getRuntimeKey() === 'node') {
  try {
    process.loadEnvFile();
  } catch {
    console.error('No .env file found');
  }
}

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  '/api/*',
  // cors({
  //   origin: ORIGIN_URLS,
  //   allowHeaders: ['Origin', 'X-Requested-With', 'User-Agent', 'Content-Type'],
  //   allowMethods: ['OPTIONS', 'HEAD', 'GET', 'POST'],
  //   maxAge: 7200,
  //   credentials: true,
  // }),
);

app.get('/', (c) => c.text('Hello world!'));

// app.route('/api/auth', auth);

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
} satisfies ExportedHandler;
