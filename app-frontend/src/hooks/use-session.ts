import { createContext, useContext } from 'react'
import type { AuthSession } from '@/hooks/use-auth-session'

/**
 * The one AuthSession created in App and shared with every page, so the
 * signed-in user is fetched once per session instead of by each consumer.
 */
export const SessionContext = createContext<AuthSession | null>(null)

export function useSession(): AuthSession {
  const session = useContext(SessionContext)
  if (!session) {
    throw new Error('useSession must be used inside <SessionContext.Provider>.')
  }
  return session
}
