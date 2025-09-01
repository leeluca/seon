import { defineConfig } from 'drizzle-kit';

process.loadEnvFile();

if (!process.env.TEST_DB_URL) {
  throw new Error('TEST_DB_URL is not set');
}

export default defineConfig({
  dialect: 'postgresql',
  out: './test/integration/setup/migrations',
  schema: './src/db/schema.ts',
  dbCredentials: {
    url: process.env.TEST_DB_URL,
  },
});
