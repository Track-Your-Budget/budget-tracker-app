import { useSession } from '@/hooks/use-session'
import { ProfileHeader } from '@/components/profile/profile-header'
import { ProfileCard } from '@/components/profile/profile-card'

export default function Profile() {
  // The user is loaded once by the session; no request of its own here.
  const { user, isUserLoading } = useSession()

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProfileHeader />
        <ProfileCard user={user} isLoading={isUserLoading} />
      </div>
    </div>
  )
}
