import { Check, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'

export function SettingsHeader() {
  return (
    <PageHeader
      eyebrow="Kontoeinstellungen"
      eyebrowIcon={SlidersHorizontal}
      title="Einstellungen"
      description="Automatisieren Sie Ihr Budget und behalten Sie Ihre Regeln im Blick."
      aside={
        <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5">
          <Check className="size-3.5" /> Änderungen werden lokal gespeichert
        </Badge>
      }
    />
  )
}
