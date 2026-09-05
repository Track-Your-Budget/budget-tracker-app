import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

// Access token lives only in memory; refresh token is an httpOnly cookie set by the backend.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(fn: UnauthorizedHandler) {
  unauthorizedHandler = fn
}

type QueueEntry = {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}

let isRefreshing = false
let pendingRequests: QueueEntry[] = []

function flushQueue(token: string | null, err: unknown) {
  const queued = pendingRequests
  pendingRequests = []
  for (const entry of queued) {
    if (token) entry.resolve(token)
    else entry.reject(err)
  }
}

/**
 * Calls the cookie-aware refresh endpoint. The refresh token is sent
 * automatically via the httpOnly cookie; no body needed.
 */
export async function refreshAccessToken(): Promise<string> {
  const { data } = await axios.post<{ access: string }>(
    '/api/token/refresh/',
    {},
    { withCredentials: true },
  )
  accessToken = data.access
  return data.access
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token) => {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${token}`,
            }
            resolve(apiClient(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const newAccessToken = await refreshAccessToken()
      flushQueue(newAccessToken, null)
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      }
      return apiClient(originalRequest)
    } catch (refreshErr) {
      flushQueue(null, refreshErr)
      accessToken = null
      unauthorizedHandler?.()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
