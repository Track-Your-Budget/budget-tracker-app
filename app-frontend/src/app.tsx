import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/require-auth'
import { Navbar } from '@/components/layout/navbar'
import { RouteErrorBoundary } from '@/components/layout/route-error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { useAuthSession } from '@/hooks/use-auth-session'
import { SessionContext } from '@/hooks/use-session'
import BudgetDashboard from '@/pages/dashboard'
import Login from '@/pages/login'
import NotFound from '@/pages/not-found'
import Profile from '@/pages/profile'
import Settings from '@/pages/settings'
import Transactions from '@/pages/transactions'

function App() {
  const session = useAuthSession()
  const { isAuthenticated, isPending, userName, logout } = session

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Signing you in…
      </div>
    )
  }

  const guard = (page: React.ReactNode) => (
    <RequireAuth isAuthenticated={isAuthenticated}>{page}</RequireAuth>
  )

  return (
    <SessionContext.Provider value={session}>
      <Router>
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar isAuthenticated={isAuthenticated} userName={userName} onLogout={logout} />
          <main className="flex-1 flex flex-col">
            <RouteErrorBoundary>
              <Routes>
                <Route
                  path="/login"
                  element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
                />
                <Route path="/" element={guard(<BudgetDashboard />)} />
                <Route path="/transactions" element={guard(<Transactions />)} />
                <Route path="/profile" element={guard(<Profile />)} />
                <Route path="/settings" element={guard(<Settings />)} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouteErrorBoundary>
          </main>
        </div>
      </Router>
      <Toaster />
    </SessionContext.Provider>
  )
}

export default App
