import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import apiClient, {
  refreshAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '@/lib/apiClient'
import { loginWithSocialProvider, PROVIDER_LABELS, SocialLoginError } from '@/lib/auth/api'
import { captureOAuthCallbackOnce } from '@/lib/auth/oauth-callback'
import { useToast } from '@/hooks/use-toast'

interface CurrentUserSummary {
  first_name?: string
  last_name?: string
  username?: string
  email?: string
}

// Captured once, at module load, before React renders (see oauth-callback.ts).
const capturedOAuth = captureOAuthCallbackOnce()

export interface AuthSession {
  isAuthenticated: boolean
  /** True while bootstrapping a session or exchanging a social-login code. */
  isPending: boolean
  userName: string | undefined
  logout: () => Promise<void>
}

/**
 * Owns the access token lifecycle: silent refresh on load, the social-login
 * code exchange, the signed-in user's display name, and logout.
 */
export function useAuthSession(): AuthSession {
  const { toast } = useToast()
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [isPending, setIsPending] = useState(true)
  const oauthHandled = useRef(false)

  const applyAccessToken = useCallback((token: string | null) => {
    setAccessToken(token)
    setAuthToken(token)
  }, [])

  // When apiClient cannot refresh, clear the session; routing bounces to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      applyAccessToken(null)
      setUserName(undefined)
    })
  }, [applyAccessToken])

  // Bootstrap: if a refresh cookie is present, silently get a fresh access token.
  // Skipped when we are about to exchange a social-login credential instead.
  useEffect(() => {
    if (capturedOAuth.credential || capturedOAuth.error) return
    let cancelled = false
    refreshAccessToken()
      .then((token) => {
        if (!cancelled) applyAccessToken(token)
      })
      .catch(() => {
        // No valid refresh cookie: the user just is not logged in yet.
      })
      .finally(() => {
        if (!cancelled) setIsPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [applyAccessToken])

  // Exchange the captured social-login credential for backend tokens.
  useEffect(() => {
    if (oauthHandled.current) return
    if (!capturedOAuth.credential && !capturedOAuth.error) return
    oauthHandled.current = true

    const provider = capturedOAuth.provider
    const providerLabel = provider ? PROVIDER_LABELS[provider] : 'Google'

    const showLoginFailed = (description: string) =>
      toast({ title: 'Anmeldung fehlgeschlagen', description, variant: 'destructive' })

    // Async IIFE so every setState runs off the effect body
    // (satisfies react-hooks/set-state-in-effect).
    const exchange = async () => {
      if (capturedOAuth.error || !provider || !capturedOAuth.credential) {
        console.error(
          `${providerLabel} login failed:`,
          capturedOAuth.error ?? 'Missing authorization response.',
        )
        showLoginFailed(`Fehler beim Anmeldedienst ${providerLabel}.`)
        return
      }

      try {
        const { accessToken } = await loginWithSocialProvider(provider, capturedOAuth.credential)
        applyAccessToken(accessToken)
      } catch (err) {
        // Full HTTP status + body go to the console; the toast only gets the
        // short, user-facing message.
        console.error(
          `${providerLabel} login failed:`,
          err instanceof SocialLoginError ? err.detail : err,
        )
        showLoginFailed(
          err instanceof SocialLoginError
            ? err.message
            : `Fehler beim Anmeldedienst ${providerLabel}.`,
        )
      }
    }

    exchange().finally(() => setIsPending(false))
  }, [applyAccessToken, toast])

  // Load the signed-in user's display name once we have a session. userName
  // is reset wherever authToken is cleared, so no cleanup setState is needed.
  useEffect(() => {
    if (!authToken) return
    let cancelled = false
    apiClient
      .get<CurrentUserSummary>('/users/me/')
      .then((res) => {
        if (cancelled) return
        const fullName = `${res.data.first_name ?? ''} ${res.data.last_name ?? ''}`.trim()
        setUserName(fullName || res.data.username || undefined)
      })
      .catch(() => {
        // 401s are already handled by the apiClient interceptor.
      })
    return () => {
      cancelled = true
    }
  }, [authToken])

  const logout = useCallback(async () => {
    try {
      // Blacklists the refresh token and clears the httpOnly cookie server-side.
      await axios.post('/api/auth/logout/', {}, { withCredentials: true })
    } catch {
      // Ignore: local state is cleared regardless.
    }
    applyAccessToken(null)
    setUserName(undefined)
  }, [applyAccessToken])

  return { isAuthenticated: Boolean(authToken), isPending, userName, logout }
}
