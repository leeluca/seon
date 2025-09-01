import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { vi } from 'vitest';

const schema = await import('../../../src/db/schema.js');

// Initialize shared in-memory PGlite database for integration tests
const testClient = new PGlite();
const testDb = drizzlePglite(testClient, { schema });

vi.mock('../../../src/db/db.js', async () => {
  const actual = await vi.importActual<typeof import('../../../src/db/db.js')>(
    '../../../src/db/db.js',
  );
  return {
    ...actual,
    getDb: () => testDb,
    getClientAndDb: () => ({ client: testClient, db: testDb }),
  };
});

export { testDb, testClient };
