import type { ReactNode } from 'react'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, parseLocalDate } from '@/lib/utils'
import { CATEGORY_COLORS, type Transaction } from '@/lib/types'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatCurrency, formatDate, formatMonthYear, getCategoryLabel } from '@/lib/format'

interface TransactionListProps {
  transactions: Transaction[]
  isLoading?: boolean
  onSelectTransaction?: (transaction: Transaction) => void
  /** Card heading. Defaults to "Letzte Transaktionen". */
  title?: string
  /** Rendered on the right side of the card header (e.g. a "view all" link). */
  headerAction?: ReactNode
  /** Insert a month heading whenever the month changes between two rows. */
  groupByMonth?: boolean
  /** Shown instead of the rows when `transactions` is empty. */
  emptyMessage?: string
  /** Rendered below the rows (e.g. a "load more" button). */
  footer?: ReactNode
}

interface MonthGroup {
  key: string
  label: string
  transactions: Transaction[]
}

function groupTransactionsByMonth(transactions: Transaction[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const transaction of transactions) {
    const date = parseLocalDate(transaction.date)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const current = groups[groups.length - 1]
    if (current && current.key === key) {
      current.transactions.push(transaction)
    } else {
      groups.push({
        key,
        label: formatMonthYear(date),
        transactions: [transaction],
      })
    }
  }
  return groups
}

export function TransactionList({
  transactions,
  isLoading,
  onSelectTransaction,
  title = 'Letzte Transaktionen',
  headerAction,
  groupByMonth = false,
  emptyMessage = 'Noch keine Transaktionen vorhanden',
  footer,
}: TransactionListProps) {
  const header = (
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {headerAction && <CardAction>{headerAction}</CardAction>}
    </CardHeader>
  )

  if (isLoading) {
    return (
      <Card className="border-border/50">
        {header}
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderRow = (transaction: Transaction) => {
    const CategoryIcon = getCategoryIcon(transaction.category)
    return (
      <button
        key={transaction.id}
        type="button"
        onClick={() => onSelectTransaction?.(transaction)}
        className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              transaction.type === 'income' ? 'bg-primary/20' : 'bg-destructive/20',
            )}
          >
            <CategoryIcon
              className="h-5 w-5 text-white"
              aria-label={getCategoryLabel(transaction.category)}
            />
          </div>
          <div>
            <p className="font-medium">{transaction.title}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  CATEGORY_COLORS[transaction.category] || 'bg-muted-foreground',
                )}
              />
              <span>{getCategoryLabel(transaction.category)}</span>
              <span>•</span>
              <span>{formatDate(transaction.date)}</span>
            </div>
          </div>
        </div>
        <span
          className={cn(
            'font-semibold',
            transaction.type === 'income' ? 'text-primary' : 'text-destructive',
          )}
        >
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </span>
      </button>
    )
  }

  return (
    <Card className="border-border/50">
      {header}
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
        ) : groupByMonth ? (
          <div className="space-y-6">
            {groupTransactionsByMonth(transactions).map((group) => (
              <section key={group.key} aria-label={group.label}>
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-sm font-semibold capitalize text-primary">{group.label}</h3>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-4">{group.transactions.map(renderRow)}</div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-4">{transactions.map(renderRow)}</div>
        )}
        {footer}
      </CardContent>
    </Card>
  )
}
