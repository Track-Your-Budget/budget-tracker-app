import { Button } from '@/components/ui/button'
import { runtimeEnv } from '@/lib/runtime-env'
import { OAUTH_PROVIDER_STORAGE_KEY } from '@/lib/auth/oauth-callback'

/**
 * Redirects the browser to Google's OAuth 2.0 authorization endpoint.
 * The full URL (including client_id, redirect_uri, scopes, response_type=code)
 * is supplied via runtimeEnv.GOOGLE_LINK. Google returns to `redirect_uri` with
 * `?code=...` in the query string; oauth-callback.ts reads the provider marker from
 * sessionStorage to know it must exchange this code at the Google backend
 * endpoint, and forwards the code for a server-side exchange.
 */
export function GoogleLoginButton() {
  const googleAuthUrl = runtimeEnv.GOOGLE_LINK

  if (!googleAuthUrl) {
    return null
  }

  const loginWithGoogle = () => {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, 'google')
    window.location.href = googleAuthUrl
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={loginWithGoogle}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.7 2.5 2.5 6.7 2.5 12S6.7 21.5 12 21.5c6.9 0 9.5-4.8 9.5-7.3 0-.5-.05-.9-.1-1.3H12z"
        />
      </svg>
      Continue with Google
    </Button>
  )
}
