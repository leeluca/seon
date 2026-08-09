import { env } from 'hono/adapter';

import { createApp } from '../app.js';
import { CaptureEmailSender } from '../auth/email.js';
import { validateAppConfig } from '../env.js';
import { createWaitUntilBackgroundTaskHandler } from '../runtime/background.js';
import { createRequestServices } from '../runtime/services.js';

const app = createApp({
  getConfig: (c) => validateAppConfig(env<Record<string, unknown> & Env>(c)),
  getRequestServices: (c) => {
    const bindings = env<Record<string, unknown> & Env>(c);
    const appConfig = c.get('appConfig');
    return createRequestServices({
      appConfig,
      databaseUrl: bindings.HYPERDRIVE.connectionString,
      databaseOptions: {
        max: 5,
        prepare: true,
        fetch_types: false,
      },
      backgroundTaskHandler: createWaitUntilBackgroundTaskHandler(
        c.executionCtx,
      ),
      emailSender:
        appConfig.emailDelivery === 'capture'
          ? new CaptureEmailSender(true)
          : undefined,
    }).services;
  },
});

export default {
  fetch(request, bindings, executionContext) {
    return app.fetch(request, bindings, executionContext);
  },
} satisfies ExportedHandler<Env>;
