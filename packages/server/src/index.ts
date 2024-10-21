import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { ORIGIN_URLS } from './constants/config.js';
import auth from './routes/auth.js';

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: ORIGIN_URLS,
    credentials: true,
    allowHeaders: ['Content-Type'],
  }),
);

app.route('/api/auth', auth);

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
