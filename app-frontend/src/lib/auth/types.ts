export type SocialProvider = 'google' | 'github' | 'microsoft'

export interface BackendAuthResponse {
  access: string
}

export interface AuthResult {
  accessToken: string
}
