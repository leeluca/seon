import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

process.loadEnvFile();
const connectionString = process.env.DB_URL;

if (!connectionString) {
  throw new Error('DB_URL is not set');
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client);
