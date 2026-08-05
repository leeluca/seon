import { v7 as uuidv7 } from 'uuid';
import { afterAll, describe, expect, it } from 'vitest';

import { TestClient } from '../setup/client.js';
import { setupTestDatabase } from '../setup/database.js';
import { setupTestServer } from '../setup/server.js';

describe('Opaque refresh session flow', async () => {
  const { cleanup } = await setupTestDatabase();
  const { getBaseUrl } = setupTestServer();

  afterAll(async () => {
    await cleanup();
  });

  it('requires an explicit refresh and safely handles concurrent tabs', async () => {
    const client = new TestClient(getBaseUrl());
    const userId = uuidv7();
    const signupResponse = await client.post('/api/auth/signup', {
      email: `test-refresh-${userId}@example.com`,
      name: `TestRefreshUser-${userId}`,
      password: 'Password123!',
      uuid: userId,
    });

    expect(signupResponse.status).toBe(200);
    const originalRefreshToken = client.getCookies().refresh_token;
    expect(originalRefreshToken).toBeTruthy();

    client.deleteCookie('access_token');
    const protectedResponse = await client.get('/api/auth/status');
    expect(protectedResponse.status).toBe(401);
    await expect(protectedResponse.json()).resolves.toMatchObject({
      error: { code: 'ACCESS_TOKEN_INVALID' },
    });

    const refreshResponses = await Promise.all([
      client.post('/api/auth/refresh', {}),
      client.post('/api/auth/refresh', {}),
    ]);
    expect(refreshResponses.map((response) => response.status)).toEqual([
      200, 200,
    ]);
    expect(client.getCookies().refresh_token).toBe(originalRefreshToken);

    const statusResponse = await client.get('/api/auth/status');
    expect(statusResponse.status).toBe(200);
    await expect(statusResponse.json()).resolves.toMatchObject({
      result: true,
      userId,
    });
  });

  it('revokes the stable refresh session on sign-out', async () => {
    const client = new TestClient(getBaseUrl());
    const userId = uuidv7();
    await client.post('/api/auth/signup', {
      email: `test-signout-${userId}@example.com`,
      name: `TestSignoutUser-${userId}`,
      password: 'Password123!',
      uuid: userId,
    });

    const signoutResponse = await client.post('/api/auth/signout', {});
    expect(signoutResponse.status).toBe(200);
    expect(client.getCookies()).not.toHaveProperty('refresh_token');

    const refreshResponse = await client.post('/api/auth/refresh', {});
    expect(refreshResponse.status).toBe(401);
  });
});
