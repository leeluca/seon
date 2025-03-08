import { defineConfig } from 'vitest/config';

if (process.loadEnvFile) {
  process.loadEnvFile();
} else {
  console.warn('process.loadEnvFile not available, skipping .env loading');
}

// TODO: improve db reset logic to enable concurrent tests
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    globals: true,
    // Higher timeout for integration tests
    testTimeout: 10000,
    // Prevent concurrent test execution
    fileParallelism: false,
    // Isolate test environments
    isolate: true,

    pool: 'forks',
    poolOptions: {
      forks: {
        // Only use a single fork
        singleFork: true,
      },
    },
  },
});
