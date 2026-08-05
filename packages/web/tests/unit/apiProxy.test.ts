// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequest } from '../../functions/api/[[path]]';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Cloudflare API proxy', () => {
  it('forwards cookies and the browser-visible origin without caching', async () => {
    const upstreamHeaders = new Headers({
      location: 'https://server.example/api/auth/status',
    });
    upstreamHeaders.append(
      'set-cookie',
      'access_token=abc; Path=/; HttpOnly; Secure; SameSite=Lax',
    );

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('ok', { status: 200, headers: upstreamHeaders }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request('https://app.example/api/auth/status', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        cookie: 'refresh_token=123',
        origin: 'https://app.example',
        'x-forwarded-for': '198.51.100.1',
      },
    });

    const response = await onRequest({
      request,
      env: { API_ORIGIN: 'https://server.example' },
    });
    const [input, init] = fetchMock.mock.calls[0];
    const forwardedHeaders = new Headers(init?.headers);

    expect(input.toString()).toBe('https://server.example/api/auth/status');
    expect(forwardedHeaders.get('cookie')).toBe('refresh_token=123');
    expect(forwardedHeaders.get('x-forwarded-for')).toBe('203.0.113.10');
    expect(forwardedHeaders.get('x-forwarded-host')).toBe('app.example');
    expect(response.headers.get('location')).toBe(
      'https://app.example/api/auth/status',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it.each([
    undefined,
    'not a url',
    'ftp://server.example',
    'https://server.example/base-path',
    'https://app.example',
  ])('rejects an invalid API origin (%s)', async (apiOrigin) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequest({
      request: new Request('https://app.example/api/auth/status'),
      env: { API_ORIGIN: apiOrigin },
    });

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a non-cacheable 502 when the server is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const response = await onRequest({
      request: new Request('https://app.example/api/auth/status'),
      env: { API_ORIGIN: 'https://server.example' },
    });

    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'API server is unavailable',
    });
  });
});
