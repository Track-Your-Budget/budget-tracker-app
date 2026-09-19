import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, UserCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function ProfileHeader() {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" aria-label="Zurück zum Dashboard">
          <Link to="/">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <UserCircle2 className="size-4" /> Kontoübersicht
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Profil
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sehen Sie Ihre Kontodaten ein und halten Sie diese aktuell.
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5">
        <ShieldCheck className="size-3.5" /> Persönliche Daten
      </Badge>
    </header>
  )
}
