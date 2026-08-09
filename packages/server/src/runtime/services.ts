import type { AuthConfig, BackgroundTaskHandler } from '../auth/auth.js';
import { createAuth } from '../auth/auth.js';
import type { EmailSender } from '../auth/email.js';
import { createDatabase, type DatabaseOptions } from '../db/db.js';
import type { AppConfig } from '../env.js';
import type { RequestServices } from '../types/context.js';

export function toAuthConfig(config: AppConfig): AuthConfig {
  return {
    secret: config.authSecret,
    baseUrl: config.authBaseUrl,
    trustedOrigins: config.trustedOrigins,
    powerSyncAudience: config.powerSyncAudience,
    secureCookies: config.secureCookies,
    emailDelivery: config.emailDelivery,
    resendApiKey: config.resendApiKey,
    emailFrom: config.emailFrom,
  };
}

export interface CreateRequestServicesOptions {
  appConfig: AppConfig;
  databaseUrl: string;
  databaseOptions?: DatabaseOptions;
  backgroundTaskHandler: BackgroundTaskHandler;
  emailSender?: EmailSender;
}

export function createRequestServices({
  appConfig,
  databaseUrl,
  databaseOptions,
  backgroundTaskHandler,
  emailSender,
}: CreateRequestServicesOptions) {
  const database = createDatabase(databaseUrl, databaseOptions);
  const services: RequestServices = {
    db: database.db,
    auth: createAuth(toAuthConfig(appConfig), {
      db: database.db,
      backgroundTaskHandler,
      emailSender,
    }),
  };

  return { ...database, services };
}
