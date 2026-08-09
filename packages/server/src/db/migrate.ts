import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { createDatabase } from './db.js';

process.loadEnvFile();
if (!process.env.DB_URL) {
  throw new Error('DB_URL is not set');
}

const { client, db } = createDatabase(process.env.DB_URL, { prepare: false });

await migrate(db, { migrationsFolder: './src/db/migrations' });

await client.end();
