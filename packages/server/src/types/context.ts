import type { Env } from '../env.js';
import type { JWTConfigEnv } from '../services/jwt';

export interface AuthRouteVariables {
  jwtConfigEnv: JWTConfigEnv;
}

export interface AuthRouteTypes {
  Bindings: Env;
  Variables: AuthRouteVariables;
}

export type { Env };
