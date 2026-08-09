import type { AuthSessionVariables } from '../auth/session.js';
import type { Auth } from '../auth/auth.js';
import type { Database } from '../db/db.js';
import type { AppConfig } from '../env.js';

export interface RequestServices {
  auth: Auth;
  db: Database;
}

export interface AppVariables extends AuthSessionVariables {
  appConfig: AppConfig;
  services: RequestServices;
}

export interface AppRouteTypes {
  Variables: AppVariables;
}
