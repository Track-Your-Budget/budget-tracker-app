import type { ReactNode } from 'react'
import { ListOrdered } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

interface TransactionsHeaderProps {
  /** Rendered on the right, e.g. the "add transaction" button. */
  aside?: ReactNode
}

export function TransactionsHeader({ aside }: TransactionsHeaderProps) {
  return (
    <PageHeader
      eyebrow="Übersicht"
      eyebrowIcon={ListOrdered}
      title="Transaktionen"
      description="Durchsuchen und filtern Sie alle Ihre Einnahmen und Ausgaben."
      aside={aside}
    />
  )
}
