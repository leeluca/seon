import { createAuthClient } from 'better-auth/react';

import { API_URL } from '~/constants';

export const AUTH_BASE_PATH = '/api/auth';

export const authClient = createAuthClient({
  ...(API_URL ? { baseURL: API_URL } : {}),
  basePath: AUTH_BASE_PATH,
  fetchOptions: {
    credentials: 'include',
  },
  sessionOptions: {
    refetchWhenOffline: false,
  },
});

export type BetterAuthSession = typeof authClient.$Infer.Session;
export type BetterAuthUser = BetterAuthSession['user'];

interface AuthErrorLike {
  message?: string;
  status?: number;
  statusText?: string;
  code?: string;
}

export class AuthClientError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly code?: string;

  constructor({
    message,
    status = 0,
    statusText = 'NETWORK_ERROR',
    code,
  }: AuthErrorLike) {
    super(message || 'Authentication request failed');
    this.name = 'AuthClientError';
    this.status = status;
    this.statusText = statusText;
    this.code = code;
  }
}

export function toAuthClientError(
  error: unknown,
  fallbackMessage = 'Authentication request failed',
) {
  if (error instanceof AuthClientError) {
    return error;
  }

  if (error && typeof error === 'object') {
    const candidate = error as AuthErrorLike & {
      error?: { message?: string; code?: string };
    };

    return new AuthClientError({
      message: candidate.message || candidate.error?.message || fallbackMessage,
      status: candidate.status,
      statusText: candidate.statusText,
      code: candidate.code || candidate.error?.code,
    });
  }

  return new AuthClientError({
    message: error instanceof Error ? error.message : fallbackMessage,
  });
}

export function authCallbackUrl(path: string) {
  if (typeof window === 'undefined') {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}
