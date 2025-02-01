import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as relations from './relations.js';
import * as schema from './schema.js';

type Schema = typeof schema & typeof relations;
type Database = ReturnType<typeof drizzle<Schema>>;

let client: ReturnType<typeof postgres> | null = null;
let db: Database | null = null;

// TODO: create a proper singleton
export const getDb = (dbUrl: string) => {
  if (db) {
    return db;
  }
  if (!dbUrl) {
    throw new Error('DB_URL is not set');
  }

  db = drizzle(dbUrl, { schema: { ...schema, ...relations } });
  return db;
};

export const getClientAndDb = (dbUrl: string) => {
  client = postgres(dbUrl, { prepare: false });
  db = drizzle(dbUrl, { schema: { ...schema, ...relations } });
  return { client, db };
};
