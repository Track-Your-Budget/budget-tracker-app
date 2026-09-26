import { Check, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'

export function SettingsHeader() {
  return (
    <PageHeader
      eyebrow="Account settings"
      eyebrowIcon={SlidersHorizontal}
      title="Settings"
      description="Automate your budget and keep an eye on your rules."
      aside={
        <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5">
          <Check className="size-3.5" /> Preview: changes are not saved yet
        </Badge>
      }
    />
  )
}
