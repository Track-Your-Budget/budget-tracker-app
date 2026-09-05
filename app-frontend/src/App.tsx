import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import BudgetDashboard from './Dashboard'
import Login from './Login'
import Profile from './Profile'
import apiClient, {
  refreshAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '@/lib/apiClient'
import { loginWithSocialProvider } from '@/lib/auth/api'
import type { SocialProvider } from '@/lib/auth/types'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'

interface CurrentUser {
  first_name?: string
  last_name?: string
  username?: string
  email?: string
}

// Captured at module load, BEFORE React renders. Otherwise the first render
// would <Navigate> away from "/" and strip the query from the URL before
// any effect could read it.
interface CapturedOAuth {
  provider: SocialProvider | null
  credential: string | null
  error: string | null
}

function stripAuthArtifactsFromUrl() {
  window.history.replaceState(null, '', window.location.pathname)
}

function captureOAuthCallbackOnce(): CapturedOAuth {
  if (typeof window === 'undefined') {
    return { provider: null, credential: null, error: null }
  }

  // All three providers now use the authorization-code flow and come back
  // as `?code=...` in the query string. The concrete provider is stored in
  // sessionStorage by the login button before redirecting out.
  const query = new URLSearchParams(window.location.search)
  const code = query.get('code')
  const queryError = query.get('error')
  if (!code && !queryError) {
    return { provider: null, credential: null, error: null }
  }

  const marker = sessionStorage.getItem('oauth_provider') as
    | SocialProvider
    | null
  sessionStorage.removeItem('oauth_provider')
  stripAuthArtifactsFromUrl()

  return {
    provider: marker,
    credential: code,
    error: queryError ?? (marker ? null : 'Missing OAuth provider marker.'),
  }
}

const capturedOAuth = captureOAuthCallbackOnce()

function App() {
  const { toast } = useToast()
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  // True while either bootstrapping a session or exchanging a Google token.
  const [authPending, setAuthPending] = useState<boolean>(true)
  const oauthHandled = useRef(false)

  const applyAccessToken = useCallback((token: string | null) => {
    setAccessToken(token)
    setAuthToken(token)
  }, [])

  // Global handler: when apiClient can't refresh, clear session and bounce to /login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      applyAccessToken(null)
      setUserName(undefined)
    })
  }, [applyAccessToken])

  // Bootstrap: if a refresh cookie is present, silently get a fresh access token.
  // Skipped when we're about to exchange a social-login credential instead.
  useEffect(() => {
    if (capturedOAuth.credential || capturedOAuth.error) return
    let cancelled = false
    refreshAccessToken()
      .then((token) => {
        if (!cancelled) applyAccessToken(token)
      })
      .catch(() => {
        // No valid refresh cookie — user just isn't logged in yet.
      })
      .finally(() => {
        if (!cancelled) setAuthPending(false)
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
    const providerLabel =
      provider === 'github'
        ? 'GitHub'
        : provider === 'microsoft'
          ? 'Microsoft'
          : 'Google'

    if (capturedOAuth.error || !provider || !capturedOAuth.credential) {
      setAuthPending(false)
      toast({
        title: `${providerLabel} login failed`,
        description: capturedOAuth.error ?? 'Missing authorization response.',
        variant: 'destructive',
      })
      return
    }

    loginWithSocialProvider(provider, capturedOAuth.credential)
      .then(({ accessToken }) => {
        applyAccessToken(accessToken)
      })
      .catch((err) => {
        console.error(`${providerLabel} login failed:`, err)
        toast({
          title: `${providerLabel} login failed`,
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        })
      })
      .finally(() => setAuthPending(false))
  }, [applyAccessToken, toast])

  // Load the current user's display name once we have a session
  useEffect(() => {
    if (!authToken) {
      setUserName(undefined)
      return
    }
    let cancelled = false
    apiClient
      .get<CurrentUser>('/users/me/')
      .then((res) => {
        if (cancelled) return
        const fullName = `${res.data.first_name ?? ''} ${res.data.last_name ?? ''}`.trim()
        setUserName(fullName || res.data.username || undefined)
      })
      .catch(() => {
        // 401s are already handled by the apiClient interceptor
      })
    return () => {
      cancelled = true
    }
  }, [authToken])

  const handleLogout = useCallback(async () => {
    try {
      // Blacklists refresh + clears the httpOnly cookie server-side.
      await axios.post('/api/auth/logout/', {}, { withCredentials: true })
    } catch {
      // Ignore — we clear local state regardless.
    }
    applyAccessToken(null)
    setUserName(undefined)
  }, [applyAccessToken])

  const isAuthenticated = Boolean(authToken)

  if (authPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Signing you in…
      </div>
    )
  }

  return (
    <>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <BudgetDashboard onLogout={handleLogout} userName={userName} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </>
  )
}

export default App


