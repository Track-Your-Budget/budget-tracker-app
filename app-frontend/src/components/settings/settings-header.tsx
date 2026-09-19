import { Link } from 'react-router-dom'
import { ArrowLeft, Check, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function SettingsHeader() {
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
            <SlidersHorizontal className="size-4" /> Kontoeinstellungen
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Einstellungen
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automatisieren Sie Ihr Budget und behalten Sie Ihre Regeln im Blick.
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5">
        <Check className="size-3.5" /> Änderungen werden lokal gespeichert
      </Badge>
    </header>
  )
}
