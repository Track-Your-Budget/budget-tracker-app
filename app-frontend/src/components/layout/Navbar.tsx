import { Link } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { UserMenu } from '@/components/budget/user-menu'

interface NavbarProps {
  isAuthenticated: boolean
  userName?: string
  onLogout: () => void
}

export function Navbar({ isAuthenticated, userName, onLogout }: NavbarProps) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to={isAuthenticated ? '/' : '/login'} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Budget Tracker</h1>
            <p className="text-xs text-muted-foreground">Verwalten Sie Ihre Finanzen</p>
          </div>
        </Link>
        {isAuthenticated && <UserMenu onLogout={onLogout} userName={userName} />}
      </div>
    </header>
  )
}
