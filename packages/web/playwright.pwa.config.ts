import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4174';
const browserChannel = process.env.PWA_BROWSER_CHANNEL as
  | 'chrome'
  | 'msedge'
  | undefined;

export default defineConfig({
  testDir: './tests/pwa',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-pwa',
      use: { ...devices['Desktop Chrome'], channel: browserChannel },
    },
  ],
  webServer: {
    command:
      './node_modules/.bin/vite build && ./node_modules/.bin/vite preview --host 127.0.0.1 --port 4174',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
