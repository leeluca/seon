import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import auth from './routes/auth';

const app = new Hono();
process.loadEnvFile();

const IS_DEV = process.env.NODE_ENV === 'development';
const ORIGIN_URL = process.env.ORIGIN_URL;

if (!IS_DEV && !ORIGIN_URL) {
  throw new Error('ORIGIN_URL is not set');
}

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (IS_DEV && origin.includes('localhost')) {
        return origin;
      }
      return ORIGIN_URL as string;
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
