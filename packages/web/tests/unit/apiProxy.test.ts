// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequest } from '../../functions/api/[[path]]';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Cloudflare API proxy', () => {
  it('forwards the request and browser-visible origin without caching', async () => {
    const upstreamHeaders = new Headers({
      location: 'https://seon-server.fly.dev/api/auth/complete?ok=true',
    });
    upstreamHeaders.append(
      'set-cookie',
      'session=abc; Path=/; HttpOnly; Secure; SameSite=Lax',
    );
    upstreamHeaders.append(
      'set-cookie',
      'session_cache=def; Path=/; HttpOnly; Secure; SameSite=Lax',
    );

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('signed in', {
        status: 201,
        headers: upstreamHeaders,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request(
      'https://app.example/api/auth/signin?returnTo=%2Fgoals',
      {
        method: 'POST',
        body: '{"email":"a@example.com"}',
      },
    );
    Object.defineProperty(request, 'headers', {
      value: new Headers({
        'cf-connecting-ip': '203.0.113.10',
        cookie: 'legacy=123',
        origin: 'https://app.example',
        'x-forwarded-for': '198.51.100.1',
      }),
    });

    const response = await onRequest({
      request,
      env: { API_ORIGIN: 'https://seon-server.fly.dev' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input, init] = fetchMock.mock.calls[0];
    const forwardedHeaders = new Headers(init?.headers);

    expect(input.toString()).toBe(
      'https://seon-server.fly.dev/api/auth/signin?returnTo=%2Fgoals',
    );
    expect(init?.method).toBe('POST');
    expect(await new Response(init?.body).text()).toBe(
      '{"email":"a@example.com"}',
    );
    expect(forwardedHeaders.get('cookie')).toBe('legacy=123');
    expect(forwardedHeaders.get('origin')).toBe('https://app.example');
    expect(forwardedHeaders.get('x-forwarded-host')).toBe('app.example');
    expect(forwardedHeaders.get('x-forwarded-proto')).toBe('https');
    expect(forwardedHeaders.get('x-forwarded-port')).toBe('443');
    expect(forwardedHeaders.get('forwarded')).toBe(
      'host="app.example";proto=https',
    );
    expect(forwardedHeaders.get('x-forwarded-for')).toBe('203.0.113.10');
    expect(forwardedHeaders.get('cache-control')).toBe('no-store');
    expect(response.status).toBe(201);
    expect(await response.text()).toBe('signed in');
    expect(response.headers.getSetCookie()).toEqual([
      'session=abc; Path=/; HttpOnly; Secure; SameSite=Lax',
      'session_cache=def; Path=/; HttpOnly; Secure; SameSite=Lax',
    ]);
    expect(response.headers.get('location')).toBe(
      'https://app.example/api/auth/complete?ok=true',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('cdn-cache-control')).toBe('no-store');
    expect(response.headers.get('cloudflare-cdn-cache-control')).toBe(
      'no-store',
    );
  });

  it('does not attach a body to GET requests', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(new Request(input, init).body).toBeNull();
        return Response.json({ ok: true });
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequest({
      request: new Request('https://app.example/api/auth/session?fresh=true'),
      env: { API_ORIGIN: 'https://seon-server.fly.dev' },
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it.each([
    undefined,
    'not a url',
    'ftp://seon-server.example',
    'https://seon-server.example/base-path',
    'https://app.example',
  ])('rejects an invalid API origin (%s)', async (apiOrigin) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequest({
      request: new Request('https://app.example/api/auth/session'),
      env: { API_ORIGIN: apiOrigin },
    });

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a non-cacheable 502 when Fly is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const response = await onRequest({
      request: new Request('https://app.example/api/auth/session'),
      env: { API_ORIGIN: 'https://seon-server.fly.dev' },
    });

    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'API server is unavailable',
    });
  });
});
