import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        // Keep test configuration independent of .env files and CI variables.
        bindings: {
          BETTER_AUTH_SECRET:
            'worker-test-secret-that-is-at-least-32-characters',
          BETTER_AUTH_URL: 'http://localhost:8787',
          POWERSYNC_AUDIENCE: 'worker-test-powersync',
          SYNC_URL: 'http://localhost:8080',
          ORIGIN_URLS: 'http://localhost:5173',
          AUTH_EMAIL_DELIVERY: 'noop',
          AUTH_EMAIL_FROM: 'Seon <auth@example.com>',
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
