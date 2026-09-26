import { ShieldCheck, UserCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'

export function ProfileHeader() {
  return (
    <PageHeader
      eyebrow="Account overview"
      eyebrowIcon={UserCircle2}
      title="Profile"
      description="View the account details your sign-in provider shared with us."
      aside={
        <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5">
          <ShieldCheck className="size-3.5" /> Personal data
        </Badge>
      }
    />
  )
}
