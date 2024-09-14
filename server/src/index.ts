import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import auth from './routes/auth';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello!');
});
app.route('/auth', auth);

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
