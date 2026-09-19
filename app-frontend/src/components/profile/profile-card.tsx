import { Mail, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { CurrentUser } from '@/lib/types'

interface ProfileCardProps {
  user: CurrentUser | null
  isLoading: boolean
}

function initials(name: string | undefined, email: string | undefined): string {
  const source = (name || email || '?').trim()
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '')
  return letters.join('') || '?'
}

export function ProfileCard({ user, isLoading }: ProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Benutzerdaten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        ) : user ? (
          <>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {user.image && <AvatarImage src={user.image} alt={user.username} />}
                <AvatarFallback className="text-lg">
                  {initials(user.username, user.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xl font-semibold">
                  {`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username || '—'}
                </div>
                <div className="text-sm text-muted-foreground">ID: {user.id}</div>
              </div>
            </div>

            <Separator />

            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserIcon className="h-4 w-4" />
                  Benutzername
                </dt>
                <dd className="text-sm font-medium break-all">{user.username || '—'}</dd>
              </div>
              <div className="space-y-1">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  E-Mail
                </dt>
                <dd className="text-sm font-medium break-all">{user.email || '—'}</dd>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <dt className="text-sm text-muted-foreground">Bio</dt>
                <dd className="text-sm whitespace-pre-wrap">
                  {user.bio?.trim() ? user.bio : '—'}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Keine Profildaten verfügbar.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
