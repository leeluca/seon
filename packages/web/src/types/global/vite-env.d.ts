/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_CDN_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.po' {
  import type { Messages } from '@lingui/core';
  export const messages: Messages;
}
