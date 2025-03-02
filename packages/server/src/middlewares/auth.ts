import { getContext } from 'hono/context-storage';
import { setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import { useAuthService } from '../services/auth-service.js';
import {
  getCookieConfig,
  signJWTWithPayload,
  type JWTTokenPayload,
} from '../services/auth.js';
import type { AuthRouteTypes } from '../types/context.js';

export const validateAccess = createMiddleware<{
  Variables: {
    jwtAccessToken: string;
    jwtAccessPayload: JWTTokenPayload;
    jwtRefreshPayload?: JWTTokenPayload;
  };
}>(async (c, next) => {
  const jwtConfigs = getContext<AuthRouteTypes>().var.jwtConfigs;
  const jwtConfigEnv = getContext<AuthRouteTypes>().var.jwtConfigEnv;
  const authService = await useAuthService(c);

  // validate access token
  const { accessPayload, accessToken } = await authService.validateAccessToken(
    c,
    jwtConfigs,
  );
  if (accessPayload && accessToken) {
    const { refreshPayload } = await authService.verifyRefreshToken(
      c,
      jwtConfigs,
    );
    c.set('jwtAccessToken', accessToken);
    c.set('jwtAccessPayload', accessPayload);
    refreshPayload && c.set('jwtRefreshPayload', refreshPayload);
    await next();
    return;
  }

  // if no access token, check for refresh token
  const { refreshToken, refreshPayload } =
    await authService.validateRefreshToken(c, jwtConfigs);

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
    signJWTWithPayload(refreshPayload.sub, 'access', jwtConfigs),
    authService.issueRefreshToken(
      refreshPayload.sub,
      jwtConfigs,
      jwtConfigEnv,
      refreshToken,
    ),
  ]);

  // Extract token and payload from refresh result
  const newRefreshToken = refreshResult.token;
  const newRefreshTokenPayload = refreshResult.payload;

  // set new tokens in cookies and context
  const { name: accessCookieName, options: accessCookieOptions } =
    getCookieConfig('access', jwtConfigs);
  const { name: refreshCookieName, options: refreshCookieOptions } =
    getCookieConfig('refresh', jwtConfigs);

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
});
