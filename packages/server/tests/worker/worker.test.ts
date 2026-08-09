import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('Cloudflare Worker entrypoint', () => {
  it('serves the health check without initializing request services', async () => {
    const response = await exports.default.fetch(
      new Request('https://seon.example/ping'),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('pong');
  });

  it('handles CORS preflights without opening a database connection', async () => {
    const response = await exports.default.fetch(
      new Request('https://seon.example/api/auth/get-session', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'GET',
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173',
    );
  });

  it('returns the shared application 404 response for unknown routes', async () => {
    const response = await exports.default.fetch(
      new Request('https://seon.example/not-a-route'),
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('404 Not Found');
  });
});
