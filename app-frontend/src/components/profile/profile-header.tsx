import { ShieldCheck, UserCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'

export function ProfileHeader() {
  return (
    <PageHeader
      eyebrow="Kontoübersicht"
      eyebrowIcon={UserCircle2}
      title="Profil"
      description="Sehen Sie Ihre Kontodaten ein und halten Sie diese aktuell."
      aside={
        <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5">
          <ShieldCheck className="size-3.5" /> Persönliche Daten
        </Badge>
      }
    />
  )
}
