import { v7 as uuidv7 } from 'uuid';
import { afterAll, describe, expect, it } from 'vitest';

import { TestClient } from '../setup/client.js';
import { setupTestDatabase } from '../setup/database.js';
import { setupTestServer } from '../setup/server.js';

// FIXME: not testing the complete refresh flow
describe('Token Refresh Flow', async () => {
  const { dbUrl, cleanup } = await setupTestDatabase();
  const { getBaseUrl } = setupTestServer(dbUrl);

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
    expect(signupResponse.status).toBe(200);

    const signupData = await signupResponse.json();
    expect(signupData.result).toBe(true);
    expect(signupData.user.email).toBe(userData.email);
  });

  it('should access protected routes after login', async () => {
    const client = new TestClient(getBaseUrl());

    const userId = uuidv7();
    const userData = {
      email: `test-protected-${userId}@example.com`,
      name: `TestProtectedUser-${userId}`,
      password: 'Password123!',
      uuid: userId,
    };

    await client.post('/api/auth/signup', userData);

    const statusResponse = await client.get('/api/auth/status');
    expect(statusResponse.status).toBe(200);

    const statusData = await statusResponse.json();
    expect(statusData.result).toBe(true);
    expect(statusData.expiresAt).toBeDefined();
  });
});
