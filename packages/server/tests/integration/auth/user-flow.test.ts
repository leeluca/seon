import { v7 as uuidv7 } from 'uuid';
import { afterAll, describe, expect, it } from 'vitest';

import { TestClient } from '../setup/client.js';
import { setupTestDatabase } from '../setup/database.js';
import { setupTestServer } from '../setup/server.js';

// TODO: test signin after registration
describe('User Authentication Flow', async () => {
  const { cleanup } = await setupTestDatabase();
  const { getBaseUrl } = setupTestServer();

  afterAll(async () => {
    await cleanup();
  });

  it('should allow user registration', async () => {
    const client = new TestClient(getBaseUrl());

    const userId = uuidv7();
    const userData = {
      email: `test-${userId}@example.com`,
      name: `TestUser-${userId}`,
      password: 'Password123!',
      uuid: userId,
    };

    const signupResponse = await client.post('/api/auth/signup', userData);
    expect(signupResponse.status).toBe(200);

    const signupData = await signupResponse.json();
    expect(signupData.result).toBe(true);
    expect(signupData.user.email).toBe(userData.email);
    expect(signupData.user.id).toBe(userData.uuid);
  });

  it('should allow status check after registration', async () => {
    const client = new TestClient(getBaseUrl());

    const userId = uuidv7();
    const userData = {
      email: `test-status-${userId}@example.com`,
      name: `TestStatusUser-${userId}`,
      password: 'Password123!',
      uuid: userId,
    };

    const signupResponse = await client.post('/api/auth/signup', userData);
    expect(signupResponse.status).toBe(200);

    const statusResponse = await client.get('/api/auth/status');
    expect(statusResponse.status).toBe(200);
    const statusData = await statusResponse.json();
    expect(statusData.result).toBe(true);
  });

  it('should sign out successfully', async () => {
    const client = new TestClient(getBaseUrl());

    const userId = uuidv7();
    const userData = {
      email: `test-signout-${userId}@example.com`,
      name: `TestSignoutUser-${userId}`,
      password: 'Password123!',
      uuid: userId,
    };

    await client.post('/api/auth/signup', userData);

    const beforeStatusResponse = await client.get('/api/auth/status');
    expect(beforeStatusResponse.status).toBe(200);

    const signoutResponse = await client.post('/api/auth/signout', {});
    expect(signoutResponse.status).toBe(200);

    // Check if cookies were properly expired in the response headers
    const setCookieHeaders = signoutResponse.headers.get('set-cookie');

    expect(setCookieHeaders).toBeTruthy();
    if (setCookieHeaders) {
      expect(setCookieHeaders).toContain('Max-Age=0');
    }

    // Manually clear cookies to simulate browser behavior
    client.clearCookies();

    const afterSignoutResponse = await client.get('/api/auth/status');
    expect(afterSignoutResponse.status).toBe(401);
  });
});
