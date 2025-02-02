/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL: string;
  readonly VITE_CDN_URL: string;
  readonly VITE_POWERSYNC_URL?: string;
  readonly VITE_POWERSYNC_DEV_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
