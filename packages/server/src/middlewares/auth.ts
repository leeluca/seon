import { getContext } from 'hono/context-storage';
import { setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import { useAuthService } from '../services/index.js';
import type { JWTConfigEnv, JWTTokenPayload } from '../services/jwt.js';
import type { AuthRouteTypes } from '../types/context.js';

export const validateAccess = createMiddleware<{
  Variables: {
    jwtAccessToken: string;
    jwtAccessPayload: JWTTokenPayload;
    jwtRefreshPayload?: JWTTokenPayload;
    jwtConfigEnv: JWTConfigEnv;
  };
}>(async (c, next) => {
  const jwtConfigEnv =
    c.get('jwtConfigEnv') ?? getContext<AuthRouteTypes>().var.jwtConfigEnv;
  const authService = await useAuthService(c);

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
    authService.signTokenWithPayload(refreshPayload.sub, 'access'),
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
    authService.getCookieConfig('access');
  const { name: refreshCookieName, options: refreshCookieOptions } =
    authService.getCookieConfig('refresh');

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
