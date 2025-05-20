/// <reference types="vitest/config" />

import { lingui } from '@lingui/vite-plugin';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';

if (process.loadEnvFile) {
  process.loadEnvFile('.env.local');
} else {
  console.warn('process.loadEnvFile not available, skipping .env loading');
}

const pwaManifest = {
  name: 'Seon Goals',
  short_name: 'Seon',
  description:
    'Seon is a local-first web app that helps you track and achieve your goals.',
  theme_color: '#F7F6FE',
  background_color: '#FFFFFF',
  icons: [
    {
      src: 'pwa-192x192.png', // <== don't add slash, for testing
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-512x512.png', // <== don't remove slash, for testing
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: 'pwa-512x512.png', // <== don't add slash, for testing
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

export default defineConfig({
  envDir: '.',
  build: {
    sourcemap: true,
  },
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
    include: [],
  },
  plugins: [
    TanStackRouterVite(),
    viteReact({
      babel: {
        plugins: ['macros'],
      },
    }),
    lingui(),
    tsconfigPaths(),
    wasm(),
    topLevelAwait(),
    VitePWA({
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: pwaManifest,
      devOptions: {
        enabled: false,
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4000000, // 4MB
        sourcemap: false,
      },
    }),
    sentryVitePlugin({
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !process.env.SENTRY_AUTH_TOKEN,
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeTracing: true,
      },
      debug: true,
    }),
  ],
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()] as Plugin[],
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: false,
  },
});
