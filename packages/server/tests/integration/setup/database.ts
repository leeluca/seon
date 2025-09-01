import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/pglite/migrator';

import { testClient, testDb } from './mock-db';

export async function setupTestDatabase() {
  // FIXME: use same migrations directory as production
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  process.env.ORIGINAL_DB_URL = process.env.DB_URL;
  // Override DB_URL to prevent tests from writing to production DB
  process.env.DB_URL = '';

  const migrationsFolder = path.join(__dirname, './migrations');

  await migrate(testDb, { migrationsFolder });

  const cleanupData = async () => {
    try {
      await testClient.exec('DELETE FROM refresh_token;');
      await testClient.exec('DELETE FROM "user";');

      console.log('Database reset complete - all test data cleared');
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
  };

  const cleanup = async () => {
    try {
      await cleanupData();
    } finally {
      if (process.env.ORIGINAL_DB_URL) {
        process.env.DB_URL = process.env.ORIGINAL_DB_URL;
      }
      try {
        await testClient.close();
      } catch {}
    }
  };

  // Clean up any existing data before beginning
  await cleanupData();

  return {
    db: testDb,
    dbUrl: '',
    client: testClient,
    cleanupData,
    cleanup,
  };
}
