import { API_URL } from '~/constants';
import { APIError } from '~/utils/errors';

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    ...(options?.body &&
      !options.headers && { headers: { 'Content-Type': 'application/json' } }),
    credentials: options?.credentials ?? 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new APIError({
      message: errorText,
      status: response.status,
      statusText: response.statusText,
    });

    throw error;
  }

  return response.json();
}

export default fetcher;
