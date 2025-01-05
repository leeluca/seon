import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { ORIGIN_URLS } from './constants/config.js';
import auth from './routes/auth.js';

const app = new Hono();
app.get('/', (c) => c.text('Hello world!'))

app.use(
  '/api/*',
  cors({
    origin: ORIGIN_URLS,
    allowHeaders: ['Origin', 'X-Requested-With', 'User-Agent', 'Content-Type'],
    allowMethods: ['OPTIONS', 'HEAD', 'GET', 'POST'],
    maxAge: 7200,
    credentials: true,
  }),
);

app.route('/api/auth', auth);

const port = 3000;
console.log(`Server is running on port ${port}`);

// serve({
//   fetch: app.fetch,
//   port,
// });

export default app;
