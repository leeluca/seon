import { API_URL } from '~/constants';
import {
  apiErrorFromResponse,
  refreshAccessSession,
} from '~/features/auth/authSession';

export type FetcherOptions = RequestInit & {
  skipAuthRefresh?: boolean;
};

async function request(path: string, options: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    ...(options.body &&
      !options.headers && { headers: { 'Content-Type': 'application/json' } }),
    credentials: options.credentials ?? 'include',
  });
}

async function fetcher<T>(
  path: string,
  options: FetcherOptions = {},
): Promise<T> {
  const { skipAuthRefresh = false, ...requestOptions } = options;
  let response = await request(path, requestOptions);

  if (!response.ok) {
    let error = await apiErrorFromResponse(response);

    if (
      !skipAuthRefresh &&
      path !== '/api/auth/refresh' &&
      error.status === 401 &&
      error.code === 'ACCESS_TOKEN_INVALID'
    ) {
      await refreshAccessSession();
      response = await request(path, requestOptions);
      if (response.ok) return response.json() as Promise<T>;
      error = await apiErrorFromResponse(response);
    }

    throw error;
  }

  return response.json() as Promise<T>;
}

export default fetcher;
