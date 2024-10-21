import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as relations from './relations.js';
import * as schema from './schema.js';

try {
  process.loadEnvFile();
} catch (error) {
  console.log('No .env file found');
}

const connectionString = process.env.DB_URL;

if (!connectionString) {
  throw new Error('DB_URL is not set');
}

export const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema: { ...schema, ...relations } });
