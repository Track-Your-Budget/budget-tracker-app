// Runtime env: values come from public/env-config.js (rewritten by the container entrypoint).
// Falls back to Vite build-time VITE_* vars so `npm run dev` keeps working with .env.local.

type RuntimeEnv = {
  GOOGLE_LINK: string
  GITHUB_LINK: string
  MICROSOFT_LINK: string
}

declare global {
  interface Window {
    _env_?: Partial<RuntimeEnv>
  }
}

const win = typeof window !== 'undefined' ? (window._env_ ?? {}) : {}

export const runtimeEnv: RuntimeEnv = {
  GOOGLE_LINK: win.GOOGLE_LINK || import.meta.env.VITE_GOOGLE_LINK || '',
  GITHUB_LINK: win.GITHUB_LINK || import.meta.env.VITE_GITHUB_LINK || '',
  MICROSOFT_LINK: win.MICROSOFT_LINK || import.meta.env.VITE_MICROSOFT_LINK || '',
}
