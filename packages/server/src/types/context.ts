import type { Env } from '../env.js';
import type { AuthService } from '../services/auth.service.js';
import type { JWTConfigEnv, JWTService } from '../services/jwt.service.js';

export interface AppVariables {
  jwtService: JWTService;
  authService: AuthService;
}

export interface AuthRouteVariables extends AppVariables {
  jwtConfigEnv: JWTConfigEnv;
}

export interface AuthRouteTypes {
  Bindings: Env;
  Variables: AuthRouteVariables;
}

export type { Env };
