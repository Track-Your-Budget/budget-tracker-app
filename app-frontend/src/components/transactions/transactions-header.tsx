import { ListOrdered } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

export function TransactionsHeader() {
  return (
    <PageHeader
      eyebrow="Übersicht"
      eyebrowIcon={ListOrdered}
      title="Transaktionen"
      description="Durchsuchen und filtern Sie alle Ihre Einnahmen und Ausgaben."
    />
  )
}
