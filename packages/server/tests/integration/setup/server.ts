import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { afterAll, beforeAll } from 'vitest';

import auth from '../../../src/routes/auth.js';
import type { Env } from '../../../src/types/context.js';

type ServerType = ReturnType<typeof serve>;

const activeServers: { server: ServerType; port: number }[] = [];

/**
 * Creates a test app with a fresh Hono instance, mimicking the production app setup
 */
export async function createTestApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.use('/api/*', async (c, next) => {
    const corsMiddleware = cors({
      origin: process.env.ORIGIN_URLS?.split(',') || '',
      allowHeaders: [
        'Origin',
        'X-Requested-With',
        'User-Agent',
        'Content-Type',
      ],
      allowMethods: ['OPTIONS', 'HEAD', 'GET', 'POST'],
      maxAge: 7200,
      credentials: true,
    });

    return corsMiddleware(c, next);
  });

  app.route('/api/auth', auth);

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  return {
    app,
  };
}

export async function cleanupAllServers() {
  for (const { server } of [...activeServers]) {
    try {
      server.close();
    } catch (error) {
      console.error('Error closing server:', error);
    }
  }
  activeServers.length = 0;
}

/**
 * Creates a server once per test file and reuses it for all tests in that file
 */
export function setupTestServer() {
  let currentServer: ServerType | null = null;
  let baseUrl = '';
  let testApp: Awaited<ReturnType<typeof createTestApp>>;

  const startServer = async () => {
    if (currentServer) {
      return { baseUrl, testApp };
    }

    await cleanupAllServers();

    try {
      process.loadEnvFile();
    } catch {
      console.warn('no .env file found');
    }

    testApp = await createTestApp();

    const port = Math.floor(Math.random() * 10000) + 10000;
    currentServer = serve({
      fetch: testApp.app.fetch,
      port,
    });

    activeServers.push({ server: currentServer, port });

    baseUrl = `http://localhost:${port}`;
    console.log(`Test server started on ${baseUrl}`);

    return { baseUrl, testApp };
  };

  const closeServer = async () => {
    if (currentServer) {
      try {
        currentServer.close();
        const index = activeServers.findIndex(
          (s) => s.server === currentServer,
        );
        if (index >= 0) {
          activeServers.splice(index, 1);
        }
        console.log(`Server on ${baseUrl} closed successfully`);
      } catch (error) {
        console.error('Error closing server:', error);
      }
      currentServer = null;
    }
  };

  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  return {
    startServer,
    closeServer,
    getBaseUrl: () => baseUrl,
  };
}
