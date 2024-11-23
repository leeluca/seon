import { lingui } from '@lingui/vite-plugin';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  envDir: '.',
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
      registerType: 'autoUpdate',
      manifest: false,
      devOptions: {
        enabled: false,
      },
    }),
  ],
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()] as Plugin[],
  },
});
