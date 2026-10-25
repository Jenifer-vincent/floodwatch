/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public base URL of the FastAPI backend. Unset in local development. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
