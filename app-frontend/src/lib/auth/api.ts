import axios from 'axios'
import type { AuthResult, BackendAuthResponse, SocialProvider } from './types'

export const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  microsoft: 'Microsoft',
}

/**
 * Thrown by loginWithSocialProvider. `message` is short, user-facing and safe to
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
    return `${providerLabel} sign-in is not configured on the server.`
  }
  if (status === 400 || status === 401 || status === 403) {
    return `Sign-in with ${providerLabel} was rejected. Please try again.`
  }
  if (status >= 500) {
    return 'The server is currently unavailable. Please try again later.'
  }
  return `Error signing in with ${providerLabel}.`
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

  const url = `/api/${provider}/login/`

  // Plain axios rather than apiClient: this request carries no bearer token
  // and must not go through the 401-refresh interceptor. `validateStatus`
  // keeps every HTTP status on the success path so the error mapping below
  // lives in one place, and `responseType: 'text'` keeps the raw body,
  // because a crashed backend answers with an HTML page, not JSON.
  let status: number
  let responseText: string
  try {
    const response = await axios.post<string>(
      url,
      { code: credential },
      { withCredentials: true, responseType: 'text', validateStatus: () => true },
    )
    status = response.status
    responseText = response.data ?? ''
  } catch (err) {
    throw new SocialLoginError(
      'Could not reach the server. Please check your internet connection.',
      `Network error calling ${url}: ${String(err)}`,
    )
  }

  const detail = `HTTP ${status} from ${url}: ${responseText || '<empty body>'}`

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

  if (status < 200 || status >= 300) {
    throw new SocialLoginError(userMessageForStatus(status, providerLabel), detail)
  }

  if (!data?.access) {
    throw new SocialLoginError(
      `Error signing in with ${providerLabel}.`,
      `Login response missing access token. ${detail}`,
    )
  }

  return { accessToken: data.access }
}
