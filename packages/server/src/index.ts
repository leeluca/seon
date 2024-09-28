import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import auth from './routes/auth';

const app = new Hono();

const IS_DEV = process.env.NODE_ENV === 'development';

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (IS_DEV && origin.includes('localhost')) {
        return origin;
      }
      return 'PRODUCTION_DOMAIN';
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
