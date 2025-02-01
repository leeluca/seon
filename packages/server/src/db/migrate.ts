import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { getClientAndDb } from './db.js';

process.loadEnvFile();
if (!process.env.DB_URL) {
  throw new Error('DB_URL is not set');
}

const { client, db } = getClientAndDb(process.env.DB_URL);

await migrate(db, { migrationsFolder: './src/db/migrations' });

await client.end();
