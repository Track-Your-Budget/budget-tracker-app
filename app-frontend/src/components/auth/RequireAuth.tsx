import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

interface RequireAuthProps {
  isAuthenticated: boolean
  children: ReactNode
}

/** Renders `children` for signed-in users and bounces everyone else to /login. */
export function RequireAuth({ isAuthenticated, children }: RequireAuthProps) {
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}
