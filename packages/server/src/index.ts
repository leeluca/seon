import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { IS_DEV, ORIGIN_URL } from './constants/config.js';
import auth from './routes/auth.js';

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (IS_DEV && origin.includes('localhost')) {
        return origin;
      }
      return ORIGIN_URL;
    },
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
