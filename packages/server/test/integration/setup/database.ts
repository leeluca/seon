import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import * as schema from '../../../src/db/schema';

export async function setupTestDatabase() {
  if (process.loadEnvFile) {
    process.loadEnvFile();
  } else {
    console.warn('process.loadEnvFile not available, skipping .env loading');
  }
  const dbUrl = process.env.TEST_DB_URL;

  if (!dbUrl) {
    throw new Error('TEST_DB_URL environment variable is not set');
  }

  const client = postgres(dbUrl, { prepare: false });
  const db = drizzle(client, { schema });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.join(__dirname, '../../../src/db/migrations');

  // Apply migrations to ensure the database schema is up to date
  await migrate(db, { migrationsFolder });

  const cleanupData = async () => {
    // Delete all data from tables in reverse order to avoid foreign key constraints
    try {
      // Disable triggers temporarily to avoid foreign key constraint issues
      await client.unsafe('SET session_replication_role = replica;');

      await db.delete(schema.refreshToken);

      await db.delete(schema.user);

      // Re-enable triggers
      await client.unsafe('SET session_replication_role = DEFAULT;');

      console.log('Database reset complete - all test data cleared');
    } catch (error) {
      console.error('Error cleaning up test database:', error);

      await client.unsafe('SET session_replication_role = DEFAULT;');
    }
  };

  const cleanup = async () => {
    try {
      await cleanupData();
    } finally {
      await client.end();
    }
  };

  // Clean up any existing data before beginning
  await cleanupData();

  return {
    db,
    dbUrl,
    client,
    cleanupData,
    cleanup,
  };
}
