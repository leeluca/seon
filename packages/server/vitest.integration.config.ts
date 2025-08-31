import { defineConfig } from 'vitest/config';

if (process.loadEnvFile) {
  process.loadEnvFile();
} else {
  console.warn('process.loadEnvFile not available, skipping .env loading');
}

export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['test/integration/setup/mock-db.ts'],
    sequence: {
      hooks: 'list',
    },
    poolOptions: {
      threads: {
        // singleThread: true, // Run tests in single thread to avoid DB conflicts
      },
    },
  },
});
