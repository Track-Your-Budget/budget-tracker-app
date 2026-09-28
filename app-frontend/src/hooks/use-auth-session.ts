import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { refreshAccessToken, setAccessToken, setUnauthorizedHandler } from '@/lib/api-client'
import { fetchCurrentUser } from '@/lib/api/users'
import { loginWithSocialProvider, PROVIDER_LABELS, SocialLoginError } from '@/lib/auth/api'
import { captureOAuthCallbackOnce } from '@/lib/auth/oauth-callback'
import { formatUserName } from '@/lib/format'
import type { CurrentUser } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

// Captured once, at module load, before React renders (see oauth-callback.ts).
const capturedOAuth = captureOAuthCallbackOnce()

export interface AuthSession {
  isAuthenticated: boolean
  /** True while bootstrapping a session or exchanging a social-login code. */
  isPending: boolean
  /** The signed-in user, fetched once per session. Null while loading or signed out. */
  user: CurrentUser | null
  /** True while `user` is being fetched after sign-in. */
  isUserLoading: boolean
  /** Display name derived from `user`; undefined until the user is loaded. */
  userName: string | undefined
  logout: () => Promise<void>
}

/**
 * Owns the access token lifecycle: silent refresh on load, the social-login
 * code exchange, the signed-in user, and logout. Consumed through
 * `useSession()` (see use-session.ts) so it is created exactly once.
 */
export function useAuthSession(): AuthSession {
  const { toast } = useToast()
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [userLoadFailed, setUserLoadFailed] = useState(false)
  const [isPending, setIsPending] = useState(true)
  const oauthHandled = useRef(false)

  const applyAccessToken = useCallback((token: string | null) => {
    setAccessToken(token)
    setAuthToken(token)
    if (!token) setUser(null)
    setUserLoadFailed(false)
  }, [])

  // When apiClient cannot refresh, clear the session; routing bounces to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => applyAccessToken(null))
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
      toast({ title: 'Sign-in failed', description, variant: 'destructive' })

    // Async IIFE so every setState runs off the effect body
    // (satisfies react-hooks/set-state-in-effect).
    const exchange = async () => {
      if (capturedOAuth.error || !provider || !capturedOAuth.credential) {
        console.error(
          `${providerLabel} login failed:`,
          capturedOAuth.error ?? 'Missing authorization response.',
        )
        showLoginFailed(`Error signing in with ${providerLabel}.`)
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
          err instanceof SocialLoginError ? err.message : `Error signing in with ${providerLabel}.`,
        )
      }
    }

    exchange().finally(() => setIsPending(false))
  }, [applyAccessToken, toast])

  // Load the signed-in user once we have a session. `user` is reset wherever
  // the token is cleared, so no cleanup setState is needed.
  useEffect(() => {
    if (!authToken) return
    let cancelled = false
    fetchCurrentUser()
      .then((loaded) => {
        if (!cancelled) setUser(loaded)
      })
      .catch((err) => {
        if (cancelled) return
        // A 401 means the refresh failed too; the interceptor already cleared
        // the session, so there is nothing to report here.
        if (axios.isAxiosError(err) && err.response?.status === 401) return
        console.error('Failed to load current user:', err)
        setUserLoadFailed(true)
        toast({
          title: 'Profile could not be loaded',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        })
      })
    return () => {
      cancelled = true
    }
  }, [authToken, toast])

  const logout = useCallback(async () => {
    try {
      // Blacklists the refresh token and clears the httpOnly cookie server-side.
      await axios.post('/api/auth/logout/', {}, { withCredentials: true })
    } catch {
      // Ignore: local state is cleared regardless.
    }
    applyAccessToken(null)
  }, [applyAccessToken])

  const isAuthenticated = Boolean(authToken)

  return {
    isAuthenticated,
    isPending,
    user,
    isUserLoading: isAuthenticated && user === null && !userLoadFailed,
    userName: user ? formatUserName(user) : undefined,
    logout,
  }
}
