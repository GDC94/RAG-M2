/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. `https://alba-rag-api.fly.dev`. Empty uses the Vite proxy. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
