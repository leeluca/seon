import { defineConfig } from 'drizzle-kit';

process.loadEnvFile();

if (!process.env.DB_URL) {
  throw new Error('DB_URL is not set');
}

export default defineConfig({
  dialect: 'postgresql',
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dbCredentials: {
    url: process.env.DB_URL,
  },
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
});
