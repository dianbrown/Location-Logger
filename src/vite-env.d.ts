/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SHEETS_ENDPOINT: string
  readonly VITE_SHEETS_API_KEY: string
  readonly VITE_TEAM_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
