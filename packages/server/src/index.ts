import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import auth from './routes/auth';

const app = new Hono();

// TODO: configure CORS
app.use('/api/*', cors());
app.route('/api/auth', auth);

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
