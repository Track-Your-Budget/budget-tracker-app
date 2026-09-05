import { GoogleLoginButton } from './GoogleLoginButton'
import { GithubLoginButton } from './GithubLoginButton'
import { MicrosoftLoginButton } from './MicrosoftLoginButton'

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

