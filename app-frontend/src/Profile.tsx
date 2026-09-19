import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'
import { useToast } from '@/hooks/use-toast'
import type { CurrentUser } from '@/lib/types'
import { ProfileHeader } from '@/components/profile/profile-header'
import { ProfileCard } from '@/components/profile/profile-card'

export default function Profile() {
  const { toast } = useToast()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get<CurrentUser>('/users/me/')
      .then((res) => {
        if (!cancelled) setUser(res.data)
      })
      .catch((err) => {
        console.error('Failed to load profile:', err)
        toast({
          title: 'Profil konnte nicht geladen werden',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        })
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [toast])

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProfileHeader />
        <ProfileCard user={user} isLoading={isLoading} />
      </div>
    </div>
  )
}
