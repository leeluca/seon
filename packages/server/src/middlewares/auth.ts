import { setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import {
  getRefreshToken,
  issueRefreshToken,
  JWT,
  JWTTokenPayload,
  validateAccessToken,
  validateRefreshToken,
} from '../services/auth';

export const validateAccess = createMiddleware<{
  Variables: {
    jwtAccessToken: string;
    jwtAccessPayload: JWTTokenPayload;
    jwtRefreshPayload?: JWTTokenPayload;
  };
}>(async (c, next) => {
  // validate access token
  const { accessPayload, accessToken } = await validateAccessToken(c);
  if (accessPayload && accessToken) {
    const { refreshPayload } = await getRefreshToken(c);
    c.set('jwtAccessToken', accessToken);
    c.set('jwtAccessPayload', accessPayload);
    refreshPayload && c.set('jwtRefreshPayload', refreshPayload);
    await next();
    return;
  }

  // if no access token, check for refresh token
  const { refreshToken, refreshPayload } = await validateRefreshToken(c);

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
    JWT.signWithPayload(refreshPayload.sub, 'access'),
    issueRefreshToken(refreshPayload.sub, refreshToken),
  ]);

  // set new tokens in cookies and context
  const { name: accessCookieName, options: accessCookieOptions } =
    JWT.getCookieOptions('access');
  const { name: refreshCookieName, options: refreshCookieOptions } =
    JWT.getCookieOptions('refresh');

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
