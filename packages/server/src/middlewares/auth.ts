import { createMiddleware } from 'hono/factory';

import {
  createAuthService,
  type JWTTokenPayload,
} from '../services/auth.service.js';
import { createJWTService } from '../services/jwt.service.js';
import type { AuthRouteTypes } from '../types/context.js';

type AuthMiddlewareEnv = {
  Bindings: AuthRouteTypes['Bindings'];
  Variables: AuthRouteTypes['Variables'] & {
    jwtAccessToken: string;
    jwtAccessPayload: JWTTokenPayload;
  };
};

export const validateAccess = createMiddleware<AuthMiddlewareEnv>(
  async (c, next) => {
    const jwtService = await createJWTService(c);
    const authService = await createAuthService(c, { jwtService });
    const { accessPayload, accessToken } =
      await authService.validateAccessToken(c);

    if (!accessPayload || !accessToken) {
      return c.json(
        {
          error: {
            code: 'ACCESS_TOKEN_INVALID',
            message: 'The access token is missing or expired',
          },
        },
        401,
      );
    }

    c.set('jwtAccessToken', accessToken);
    c.set('jwtAccessPayload', accessPayload);
    await next();
  },
);
