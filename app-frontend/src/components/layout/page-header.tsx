import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  /** Small icon + label line above the title, e.g. "Kontoeinstellungen". */
  eyebrow: string
  eyebrowIcon: LucideIcon
  title: string
  description: string
  /** Optional element on the right, e.g. a status badge. */
  aside?: ReactNode
}

/** The header every sub-page shares: back button, eyebrow, title, description. */
export function PageHeader({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  description,
  aside,
}: PageHeaderProps) {
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
            <EyebrowIcon className="size-4" /> {eyebrow}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {aside}
    </header>
  )
}
