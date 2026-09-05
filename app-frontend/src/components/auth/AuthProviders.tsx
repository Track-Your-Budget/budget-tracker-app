import type { ReactNode } from 'react'

/**
 * Composes third-party auth SDK providers around the app.
 * Currently we use a pure OAuth 2.0 redirect flow (see GoogleLoginButton),
 * so no SDK provider is required. Kept as a passthrough so future SDK
 * providers can be wrapped here without touching main.
 */
interface AuthProvidersProps {
  children: ReactNode
}

export function AuthProviders({ children }: AuthProvidersProps) {
  return <>{children}</>
}

