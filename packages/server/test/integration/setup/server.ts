import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { afterAll, beforeAll } from 'vitest';

import auth from '../../../src/routes/auth.js';
import type { Env } from '../../../src/types/context.js';
import { createJWTTestData } from '../../utils/jwt-test-utils.js';

type ServerType = ReturnType<typeof serve>;

const activeServers: { server: ServerType; port: number }[] = [];

/**
 * Creates a test app with a fresh Hono instance, mimicking the production app setup
 */
export async function createTestApp(dbUrl: string) {
  const jwtTestData = await createJWTTestData();

  const testEnv: Env = {
    DB_URL: dbUrl,
    JWT_PRIVATE_KEY: jwtTestData.config.privateKey,
    JWT_PUBLIC_KEY: jwtTestData.config.publicKey,
    JWT_REFRESH_SECRET: jwtTestData.config.refreshSecret,
    JWT_DB_PRIVATE_KEY: jwtTestData.config.dbPrivateKey,
    JWT_ACCESS_EXPIRATION: jwtTestData.config.accessExpiration,
    JWT_REFRESH_EXPIRATION: jwtTestData.config.refreshExpiration,
    JWT_DB_ACCESS_EXPIRATION: jwtTestData.config.dbAccessExpiration,
    SYNC_URL: 'http://localhost:8787',
    ORIGIN_URL: 'http://localhost:5173',
  };

  const app = new Hono<{ Bindings: Env }>();

  app.use('/api/*', async (c, next) => {
    const corsMiddleware = cors({
      origin: testEnv.ORIGIN_URL?.split(',') || '',
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
    jwtTestData,
    testEnv,
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
export function setupTestServer(dbUrl: string) {
  let currentServer: ServerType | null = null;
  let baseUrl = '';
  let testApp: Awaited<ReturnType<typeof createTestApp>>;

  const startServer = async () => {
    if (currentServer) {
      return { baseUrl, testApp };
    }

    await cleanupAllServers();

    testApp = await createTestApp(dbUrl);

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
