import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';

import type { AppConfig } from './env.js';
import auth from './routes/auth.js';
import sync from './routes/sync.js';
import type { AppRouteTypes, RequestServices } from './types/context.js';

type AppContext = Context<AppRouteTypes>;

export interface AppDependencies {
  getConfig(context: AppContext): AppConfig;
  getRequestServices(
    context: AppContext,
  ): RequestServices | Promise<RequestServices>;
}

export function createApp({ getConfig, getRequestServices }: AppDependencies) {
  const app = new Hono<AppRouteTypes>();

  app.use('/api/*', async (c, next) => {
    const appConfig = getConfig(c);
    c.set('appConfig', appConfig);

    return cors({
      origin: appConfig.allowedOrigins,
      allowHeaders: [
        'Origin',
        'X-Requested-With',
        'User-Agent',
        'Content-Type',
        'X-Seon-Workspace-Owner-Id',
      ],
      allowMethods: ['OPTIONS', 'HEAD', 'GET', 'POST'],
      maxAge: 7200,
      credentials: true,
    })(c, next);
  });

  app.use('/api/*', async (c, next) => {
    c.set('services', await getRequestServices(c));
    await next();
  });

  app.get('/ping', (c) => c.text('pong'));

  app.route('/api/auth', auth);
  app.route('/api/sync', sync);

  return app;
}
