import { getRuntimeKey } from 'hono/adapter';

import { createApp } from './app.js';

const runtime = getRuntimeKey();

if (runtime === 'node') {
  // NOTE: some runtimes inject env variables without .env file
  try {
    process.loadEnvFile();
  } catch {
    console.error('No .env file found');
  }
}

const app = createApp();

if (runtime === 'node') {
  const { serve } = await import('@hono/node-server');
  const port = Number(process.env.PORT) || 3000;

  console.log(`Server is running on port ${port}`);

  serve({
    fetch: app.fetch,
    port,
  });
}

export default {
  fetch: app.fetch,
};
