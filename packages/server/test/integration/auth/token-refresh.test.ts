import { v7 as uuidv7 } from 'uuid';
import { afterAll, describe, expect, it } from 'vitest';

import { TestClient } from '../setup/client.js';
import { setupTestDatabase } from '../setup/database.js';
import { setupTestServer } from '../setup/server.js';

describe('Token Refresh Flow', async () => {
  const { cleanup } = await setupTestDatabase();
  const { getBaseUrl } = setupTestServer();

  afterAll(async () => {
    await cleanup();
  });

  it('should register a user successfully', async () => {
    const client = new TestClient(getBaseUrl());

    const userId = uuidv7();
    const userData = {
      email: `test-${userId}@example.com`,
      name: `TestUser-${userId}`,
      password: 'Password123!',
      uuid: userId,
    };

    const signupResponse = await client.post('/api/auth/signup', userData);

    const signupData: {
      result: boolean;
      expiresAt: number;
      user: Record<string, unknown>;
    } = await signupResponse.json();

    expect(signupResponse.status).toBe(200);

    expect(signupData.result).toBe(true);
  });

  //   it('should automatically refresh tokens using validateAccess middleware', async () => {
  //     const client = new TestClient(getBaseUrl());

  //     client.clearCookies();

  //     const userId = uuidv7();
  //     const userData = {
  //       email: `test-refresh-${userId}@example.com`,
  //       name: `TestRefreshUser-${userId}`,
  //       password: 'Password123!',
  //       uuid: userId,
  //     };
  //     const signupResponse = await client.post('/api/auth/signup', userData);

  //     interface AuthResponse {
  //       result: boolean;
  //       expiresAt: number;
  //       user: Record<string, unknown>;
  //     }
  //     const signupData: AuthResponse = await signupResponse.json();

  //     expect(signupResponse.status).toBe(200);

  //     const originalExpiresAt = signupData.expiresAt;

  //     const initialStatusResponse = await client.get('/api/auth/status');

  //     expect(initialStatusResponse.status).toBe(200);

  //     client.deleteCookie('access_token');

  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     const refreshedStatusResponse = await client.get('/api/auth/status');
  //     expect(refreshedStatusResponse.status).toBe(200);

  //     const refreshedStatusData: AuthResponse =
  //       await refreshedStatusResponse.json();

  //     expect(refreshedStatusData.expiresAt).toBeGreaterThan(originalExpiresAt);

  //     if (refreshedStatusResponse.status === 200) {
  //       const setCookieHeader = refreshedStatusResponse.headers.get('set-cookie');

  //       expect(setCookieHeader).toBeTruthy();
  //       if (setCookieHeader) {
  //         expect(setCookieHeader).toContain('access_token');
  //       }

  //       const finalStatusResponse = await client.get('/api/auth/status');
  //       expect(finalStatusResponse.status).toBe(200);
  //     }
  //   });

  it('should handle expired refresh tokens properly', async () => {
    const client = new TestClient(getBaseUrl());

    const userId = uuidv7();
    const userData = {
      email: `test-expired-${userId}@example.com`,
      name: `TestExpiredUser-${userId}`,
      password: 'Password123!',
      uuid: userId,
    };

    await client.post('/api/auth/signup', userData);

    client.clearCookies();

    const statusResponse = await client.get('/api/auth/status');
    expect(statusResponse.status).toBe(401);
  });
});
