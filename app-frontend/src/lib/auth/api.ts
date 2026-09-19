import type { AuthResult, BackendAuthResponse, SocialProvider } from './types'

export const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  microsoft: 'Microsoft',
}

/**
 * Thrown by loginWithSocialProvider. `message` is short, German and safe to
 * put in a toast; `detail` carries the HTTP status and raw body for the
 * console so debugging information is not lost.
 */
export class SocialLoginError extends Error {
  readonly detail: string

  constructor(message: string, detail: string) {
    super(message)
    this.name = 'SocialLoginError'
    this.detail = detail
  }
}

// DRF renders APIException subclasses as {"detail": "...", ...}; our
// SocialProviderMisconfigured additionally sets this code via
// default_code, but only `detail` reaches the wire by default.
interface BackendErrorBody {
  detail?: string
  non_field_errors?: string[]
}

function userMessageForStatus(status: number, providerLabel: string): string {
  if (status === 503) {
    return `Der Anmeldedienst ${providerLabel} ist auf dem Server nicht eingerichtet.`
  }
  if (status === 400 || status === 401 || status === 403) {
    return `Die Anmeldung über ${providerLabel} wurde abgelehnt. Bitte versuchen Sie es erneut.`
  }
  if (status >= 500) {
    return 'Der Server ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut.'
  }
  return `Fehler beim Anmeldedienst ${providerLabel}.`
}

/**
 * Exchanges a provider-issued OAuth authorization code for a backend access
 * token. The refresh token is delivered by the backend as an httpOnly cookie,
 * so we MUST send credentials to receive/keep it.
 *
 * Backend contract (dj-rest-auth SocialLoginView): POST /api/{provider}/login/
 * All three providers use the authorization-code flow; the backend performs
 * the server-side code exchange with its client secret.
 */
export async function loginWithSocialProvider(
  provider: SocialProvider,
  credential: string,
): Promise<AuthResult> {
  const providerLabel = PROVIDER_LABELS[provider]

  let response: Response
  try {
    response = await fetch(`/api/${provider}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code: credential }),
    })
  } catch (err) {
    throw new SocialLoginError(
      'Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.',
      `Network error calling /api/${provider}/login/: ${String(err)}`,
    )
  }

  const responseText = await response.text()
  const detail = `HTTP ${response.status} from /api/${provider}/login/: ${responseText || '<empty body>'}`

  let data: (BackendAuthResponse & BackendErrorBody) | null = null
  if (responseText) {
    try {
      data = JSON.parse(responseText) as BackendAuthResponse & BackendErrorBody
    } catch {
      // An HTML error page (e.g. an uncaught server exception) is a server
      // fault regardless of the status code it came with.
      throw new SocialLoginError(userMessageForStatus(500, providerLabel), detail)
    }
  }

  if (!response.ok) {
    throw new SocialLoginError(userMessageForStatus(response.status, providerLabel), detail)
  }

  if (!data?.access) {
    throw new SocialLoginError(
      `Fehler beim Anmeldedienst ${providerLabel}.`,
      `Login response missing access token. ${detail}`,
    )
  }

  return { accessToken: data.access }
}
