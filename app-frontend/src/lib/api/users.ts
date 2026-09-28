import apiClient from '@/lib/api-client'
import type { CurrentUser } from '@/lib/types'

/** The signed-in user with avatar URL and bio. */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await apiClient.get<CurrentUser>('/users/me/')
  return response.data
}
