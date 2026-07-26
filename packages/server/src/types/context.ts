import type { Env } from '../env.js';
import type { AuthSessionVariables } from '../auth/session.js';

export interface AuthRouteTypes {
  Bindings: Env;
  Variables: AuthSessionVariables;
}

export type { Env };
