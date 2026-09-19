import type { SocialProvider } from './types'

/** Key under which the login buttons remember which provider they sent the user to. */
export const OAUTH_PROVIDER_STORAGE_KEY = 'oauth_provider'

export interface CapturedOAuth {
  provider: SocialProvider | null
  /** The authorization code returned by the provider. */
  credential: string | null
  error: string | null
}

const NOTHING_CAPTURED: CapturedOAuth = { provider: null, credential: null, error: null }

function stripAuthArtifactsFromUrl() {
  window.history.replaceState(null, '', window.location.pathname)
}

/**
 * Reads a provider redirect (`?code=…` or `?error=…`) out of the current URL.
 *
 * Must run at module load, BEFORE React renders: the first render would
 * otherwise <Navigate> away from "/" and strip the query string before any
 * effect could read it. All providers use the authorization-code flow; the
 * concrete provider is stored in sessionStorage by the login button before
 * it redirects out.
 */
export function captureOAuthCallbackOnce(): CapturedOAuth {
  if (typeof window === 'undefined') return NOTHING_CAPTURED

  const query = new URLSearchParams(window.location.search)
  const code = query.get('code')
  const queryError = query.get('error')
  if (!code && !queryError) return NOTHING_CAPTURED

  const provider = sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY) as SocialProvider | null
  sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY)
  stripAuthArtifactsFromUrl()

  return {
    provider,
    credential: code,
    error: queryError ?? (provider ? null : 'Missing OAuth provider marker.'),
  }
}
