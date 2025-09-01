import { v7 as uuidv7 } from 'uuid';
import { afterAll, describe, expect, it } from 'vitest';

import { TestClient } from '../setup/client.js';
import { setupTestDatabase } from '../setup/database.js';
import { setupTestServer } from '../setup/server.js';

describe('Authentication Error Handling', async () => {
  const { cleanup } = await setupTestDatabase();
  const { getBaseUrl } = setupTestServer();

  afterAll(async () => {
    await cleanup();
  });

  it('should handle invalid login credentials', async () => {
    const client = new TestClient(getBaseUrl());

    const loginResponse = await client.post('/api/auth/signin', {
      email: 'nonexistent@example.com',
      password: 'WrongPassword123!',
    });

    expect(loginResponse.status).toBe(401);

    const responseText = await loginResponse.text();
    expect(responseText).toBeTruthy();
  });

  it('should handle duplicate user registration', async () => {
    const client = new TestClient(getBaseUrl());
    const uniqueId = uuidv7();
    const userData = {
      email: `duplicate-${uniqueId}@example.com`,
      name: 'DuplicateUser',
      password: 'Password123!',
      uuid: uuidv7(),
    };

    const firstResponse = await client.post('/api/auth/signup', userData);
    expect(firstResponse.status).toBe(200);

    const secondUserData = {
      ...userData,
      uuid: uuidv7(),
    };
    const secondResponse = await client.post(
      '/api/auth/signup',
      secondUserData,
    );
    expect(secondResponse.status).toBe(409);
  });

  it('should reject access to protected routes without authentication', async () => {
    const client = new TestClient(getBaseUrl());

    const statusResponse = await client.get('/api/auth/status');
    expect(statusResponse.status).toBe(401);

    const credentialsResponse = await client.get('/api/auth/credentials/db');
    expect(credentialsResponse.status).toBe(401);
  });
});
