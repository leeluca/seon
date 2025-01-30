import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as relations from './relations.js';
import * as schema from './schema.js';

let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

const initDb = (dbUrl?: string) => {
  if (db) {
    return { client, db };
  }
  if (!dbUrl) {
    throw new Error('DB_URL is not set');
  }

  client = postgres(dbUrl, { prepare: false });
  db = drizzle(client, { schema: { ...schema, ...relations } });
  return { client, db };
};

export { client, db, initDb };
