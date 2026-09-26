import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import BudgetDashboard from './Dashboard'
import Login from './Login'
import Profile from './Profile'
import Settings from './Settings'
import Transactions from './Transactions'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Toaster } from '@/components/ui/toaster'
import { useAuthSession } from '@/hooks/use-auth-session'

function App() {
  const { isAuthenticated, isPending, userName, logout } = useAuthSession()

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
    <>
      <Router>
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar isAuthenticated={isAuthenticated} userName={userName} onLogout={logout} />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
              />
              <Route path="/" element={guard(<BudgetDashboard />)} />
              <Route path="/transactions" element={guard(<Transactions />)} />
              <Route path="/profile" element={guard(<Profile />)} />
              <Route path="/settings" element={guard(<Settings />)} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
      <Toaster />
    </>
  )
}

export default App
