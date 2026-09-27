import { GoogleLoginButton } from './google-login-button'
import { GithubLoginButton } from './github-login-button'
import { MicrosoftLoginButton } from './microsoft-login-button'

/**
 * Renders every configured social login button. Add new providers by
 * dropping their button component here; each button self-disables when
 * its env var is not configured.
 */
export function SocialLoginButtons() {
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <GoogleLoginButton />
      <GithubLoginButton />
      <MicrosoftLoginButton />
    </div>
  )
}
