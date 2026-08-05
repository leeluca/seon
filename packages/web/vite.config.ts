/// <reference types="vitest/config" />

import { lingui, linguiTransformerBabelPreset } from '@lingui/vite-plugin';
import babel from '@rolldown/plugin-babel';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';

try {
  process.loadEnvFile('.env.local');
} catch (error) {
  console.warn('Failed to load .env.local', error);
}

const pwaManifest = {
  id: '/',
  name: 'Seon Goals',
  short_name: 'Seon',
  description:
    'Seon is a local-first web app that helps you track and achieve your goals.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  theme_color: '#F7F6FE',
  background_color: '#FFFFFF',
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
} satisfies Partial<ManifestOptions>;

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
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
    lingui(),
    babel({
      presets: [linguiTransformerBabelPreset()],
    }),
    wasm(),
    VitePWA({
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: pwaManifest,
      devOptions: {
        enabled: false,
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4000000, // 4MB
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
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
    plugins: () => [wasm()] as Plugin[],
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: false,
    exclude: [
      '**/tests/e2e/**',
      '**/tests/pwa/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
