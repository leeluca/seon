import type {
  JWTConfigEnv,
  JWTTokenPayload,
  JWTTypeConfig,
} from '../services/auth';

export interface Env {
  DB_URL: string;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  JWT_REFRESH_SECRET: string;
  JWT_DB_PRIVATE_KEY: string;
  JWT_ACCESS_EXPIRATION: string;
  JWT_REFRESH_EXPIRATION: string;
  JWT_DB_ACCESS_EXPIRATION: string;
  SYNC_URL: string;
  // allowed origins for CORS, comma separated string
  // FIXME: change name to ORIGIN_URLS to denote that many origins are allowed
  ORIGIN_URL: string;
}

export interface AuthRouteVariables {
  jwtConfigEnv: JWTConfigEnv;
  jwtConfigs: Record<string, JWTTypeConfig>;
  jwtPayload: JWTTokenPayload;
  jwtAccessToken: string;
  jwtAccessPayload: JWTTokenPayload;
  jwtRefreshPayload?: JWTTokenPayload;
}

export interface AuthRouteTypes {
  Bindings: Env;
  Variables: AuthRouteVariables;
}
