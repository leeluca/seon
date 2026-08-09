import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          BETTER_AUTH_SECRET:
            'worker-test-secret-that-is-at-least-32-characters',
          RESEND_API_KEY: 'worker-test-resend-key',
        },
        hyperdrives: {
          HYPERDRIVE: 'postgres://test:test@127.0.0.1:5432/seon_test',
        },
      },
    }),
  ],
  test: {
    include: ['tests/worker/**/*.test.ts'],
    testTimeout: 15000,
  },
});
