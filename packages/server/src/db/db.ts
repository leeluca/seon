import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as relations from './relations.js';
import * as schema from './schema.js';

type Schema = typeof schema & typeof relations;
export type Database = ReturnType<typeof drizzle<Schema>>;
export type DatabaseClient = ReturnType<typeof postgres>;
export type DatabaseOptions = NonNullable<Parameters<typeof postgres>[1]>;

export function createDatabase(
  databaseUrl: string,
  options: DatabaseOptions = {},
) {
  if (!databaseUrl) {
    throw new Error('DB_URL is not set');
  }

  const client = postgres(databaseUrl, options);
  const db = drizzle(client, { schema: { ...schema, ...relations } });
  return { client, db };
}
