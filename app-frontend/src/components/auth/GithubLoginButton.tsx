import { Button } from '@/components/ui/button'

/**
 * Redirects the browser to GitHub's OAuth authorization endpoint. GitHub only
 * supports the authorization-code flow, so the browser returns to
 * `redirect_uri` with `?code=...` in the query string. App.tsx picks it up
 * and exchanges it for backend JWTs.
 */
export function GithubLoginButton() {
  const githubAuthUrl = import.meta.env.VITE_GITHUB_LINK

  if (!githubAuthUrl) {
    return null
  }

  const loginWithGithub = () => {
    sessionStorage.setItem('oauth_provider', 'github')
    window.location.href = githubAuthUrl
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={loginWithGithub}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
        <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.12 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.35.78 1.05.78 2.12v3.14c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
      </svg>
      Continue with GitHub
    </Button>
  )
}

