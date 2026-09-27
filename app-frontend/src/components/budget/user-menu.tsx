import { User, Settings, LogOut, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu({ onLogout, userName }: { onLogout: () => void; userName?: string }) {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full h-11 w-11">
          <User className="h-8 w-8" />
          <span className="sr-only">Open user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {userName && (
          <>
            <DropdownMenuLabel className="font-normal">
              <span className="font-semibold">{userName}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
          <DropdownMenuItem
          variant="outline"
          className="cursor-pointer"
          onClick={() => navigate('/profile')}
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="outline"
          className="cursor-pointer"
          onClick={() => navigate('/insights')}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Insights
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="outline"
          className="cursor-pointer"
          onClick={() => navigate('/settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="cursor-pointer" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
