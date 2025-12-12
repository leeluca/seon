import { setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

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
    jwtRefreshPayload?: JWTTokenPayload;
  };
};

export const validateAccess = createMiddleware<AuthMiddlewareEnv>(
  async (c, next) => {
    const jwtConfigEnv = c.get('jwtConfigEnv');

    if (!jwtConfigEnv) {
      throw new HTTPException(500, { message: 'JWT config missing' });
    }

    const jwtService = await createJWTService(c);
    const authService = await createAuthService(c, { jwtService });

    // validate access token
    const { accessPayload, accessToken } =
      await authService.validateAccessToken(c);
    if (accessPayload && accessToken) {
      const { refreshPayload } = await authService.verifyRefreshToken(c);
      c.set('jwtAccessToken', accessToken);
      c.set('jwtAccessPayload', accessPayload);
      refreshPayload && c.set('jwtRefreshPayload', refreshPayload);
      await next();
      return;
    }

    // if no access token, check for refresh token
    const { refreshToken, refreshPayload } =
      await authService.validateRefreshToken(c);

    if (!refreshToken || !refreshPayload) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
      });
    }

    // if refresh token is valid, issue new access and refresh tokens
    const [
      { token: newAccessToken, payload: newAccessTokenPayload },
      refreshResult,
    ] = await Promise.all([
      jwtService.signTokenWithPayload(refreshPayload.sub, 'access'),
      authService.issueRefreshToken(
        refreshPayload.sub,
        jwtConfigEnv,
        refreshToken,
      ),
    ]);

    // Extract token and payload from refresh result
    const newRefreshToken = refreshResult.token;
    const newRefreshTokenPayload = refreshResult.payload;

    // set new tokens in cookies and context
    const { name: accessCookieName, options: accessCookieOptions } =
      jwtService.getCookieConfig('access');
    const { name: refreshCookieName, options: refreshCookieOptions } =
      jwtService.getCookieConfig('refresh');

    setCookie(c, accessCookieName, newAccessToken, {
      ...accessCookieOptions,
    });
    setCookie(c, refreshCookieName, newRefreshToken, {
      ...refreshCookieOptions,
    });
    c.set('jwtAccessToken', newAccessToken);
    c.set('jwtAccessPayload', newAccessTokenPayload);
    c.set('jwtRefreshPayload', newRefreshTokenPayload);

    await next();
  },
);
