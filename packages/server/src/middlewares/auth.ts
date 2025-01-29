import { getContext } from 'hono/context-storage';
import { setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { Bindings } from '../index.js';
import type { Variables } from '../routes/auth.js';
import {
  getCookieConfig,
  issueRefreshToken,
  signJWTWithPayload,
  validateAccessToken,
  validateRefreshToken,
  verifyRefreshToken,
  type JWTTokenPayload,
} from '../services/auth.js';

export const validateAccess = createMiddleware<{
  Variables: {
    jwtAccessToken: string;
    jwtAccessPayload: JWTTokenPayload;
    jwtRefreshPayload?: JWTTokenPayload;
  };
}>(async (c, next) => {
  const jwtConfigs = getContext<{ Bindings: Bindings; Variables: Variables }>()
    .var.jwtConfigs;
  const jwtConfig = getContext<{ Bindings: Bindings; Variables: Variables }>()
    .var.jwtConfig;

  // validate access token
  const { accessPayload, accessToken } = await validateAccessToken(
    c,
    jwtConfigs,
  );
  if (accessPayload && accessToken) {
    const { refreshPayload } = await verifyRefreshToken(c, jwtConfigs);
    c.set('jwtAccessToken', accessToken);
    c.set('jwtAccessPayload', accessPayload);
    refreshPayload && c.set('jwtRefreshPayload', refreshPayload);
    await next();
    return;
  }

  // if no access token, check for refresh token
  const { refreshToken, refreshPayload } = await validateRefreshToken(
    c,
    jwtConfigs,
  );

  if (!refreshToken) {
    throw new HTTPException(401, {
      message: 'Unauthorized',
    });
  }

  // if refresh token is valid, issue new access and refresh tokens
  const [
    { token: newAccessToken, payload: newAccessTokenPayload },
    { token: newRefreshToken, payload: newRefreshTokenPayload },
  ] = await Promise.all([
    signJWTWithPayload(refreshPayload.sub, 'access', jwtConfigs),
    issueRefreshToken(refreshPayload.sub, jwtConfigs, jwtConfig, refreshToken),
  ]);

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
