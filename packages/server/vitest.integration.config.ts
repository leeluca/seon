import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/unit/auth/auth-flow.test.ts',
      'tests/unit/services/sync-service.test.ts',
    ],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      hooks: 'list',
    },
  },
});
