/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_LEGACY_EMAIL?: string;
  readonly VITE_DEV_LEGACY_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
