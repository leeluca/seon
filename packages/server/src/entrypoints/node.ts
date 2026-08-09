import { serve } from '@hono/node-server';

import { createApp } from '../app.js';
import { CaptureEmailSender } from '../auth/email.js';
import { validateNodeConfig } from '../env.js';
import { createBackgroundTaskTracker } from '../runtime/background.js';
import { createRequestServices } from '../runtime/services.js';
import { shutdownNodeRuntime } from '../runtime/shutdown.js';

try {
  process.loadEnvFile();
} catch {
  console.info('No .env file found; using the process environment');
}

const { appConfig, databaseUrl } = validateNodeConfig(process.env);
const backgroundTasks = createBackgroundTaskTracker();
const nodeRuntime = createRequestServices({
  appConfig,
  databaseUrl,
  databaseOptions: { prepare: false },
  backgroundTaskHandler: backgroundTasks.defer,
  emailSender:
    appConfig.emailDelivery === 'capture'
      ? new CaptureEmailSender(true)
      : undefined,
});
const app = createApp({
  getConfig: () => appConfig,
  getRequestServices: () => nodeRuntime.services,
});
const port = Number(process.env.PORT) || 3000;
const server = serve({ fetch: app.fetch, port });

console.info(`Server is running on port ${port}`);

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Received ${signal}; shutting down`);

  await shutdownNodeRuntime({
    closeServer: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
    drainBackgroundTasks: backgroundTasks.drain,
    closeDatabase: () => nodeRuntime.client.end({ timeout: 5 }),
  });
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      console.error(
        JSON.stringify({
          event: 'server_shutdown_failed',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      process.exitCode = 1;
    });
  });
}
