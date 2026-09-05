import { Button } from '@/components/ui/button'

/**
 * Redirects the browser to Microsoft's OAuth authorization endpoint.
 * Microsoft only supports the authorization-code flow, so the browser returns
 * to `redirect_uri` with `?code=...` in the query string. App.tsx reads the
 * provider marker from sessionStorage to know it must exchange this code at
 * the Microsoft backend endpoint (not the GitHub one).
 */
export function MicrosoftLoginButton() {
  const microsoftAuthUrl = import.meta.env.VITE_MICROSOFT_LINK

  if (!microsoftAuthUrl) {
    return null
  }

  const loginWithMicrosoft = () => {
    sessionStorage.setItem('oauth_provider', 'microsoft')
    window.location.href = microsoftAuthUrl
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={loginWithMicrosoft}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
        <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
        <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
        <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
        <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
      </svg>
      Continue with Microsoft
    </Button>
  )
}
