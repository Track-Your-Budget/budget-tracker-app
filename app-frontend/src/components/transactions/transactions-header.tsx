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
      eyebrow="Overview"
      eyebrowIcon={ListOrdered}
      title="Transactions"
      description="Browse and filter all your income and expenses."
      aside={aside}
    />
  )
}
