import type {
  AuthResult,
  BackendAuthResponse,
  SocialProvider,
} from './types'

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
  const response = await fetch(`/api/${provider}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code: credential }),
  })

  const responseText = await response.text()
  let data: BackendAuthResponse | null = null
  if (responseText) {
  try {
    data = JSON.parse(responseText) as BackendAuthResponse
  } catch {
      throw new Error(
        `Invalid JSON from ${provider} auth endpoint (HTTP ${response.status}): ${responseText}`,
      )
    }
  }

  if (!response.ok) {
    throw new Error(
      `Backend ${provider} login failed (HTTP ${response.status}): ${responseText || '<empty body>'}`,
    )
  }

  if (!data?.access) {
    throw new Error(`Backend ${provider} login response missing access token`)
  }

  return { accessToken: data.access }
}
