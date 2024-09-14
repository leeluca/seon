import { defineConfig } from 'drizzle-kit';

process.loadEnvFile();

console.log('DB_URL:', process.env.DB_URL);
export default defineConfig({
  dialect: 'postgresql',
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dbCredentials: {
    url: process.env.DB_URL as string,
  },
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
});
