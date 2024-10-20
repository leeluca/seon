import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { client, db } from './db.js';

await migrate(db, { migrationsFolder: './src/db/migrations' });

await client.end();
