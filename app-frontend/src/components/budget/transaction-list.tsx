'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES, CATEGORY_COLORS, type Transaction } from '@/lib/types'

interface TransactionListProps {
  transactions: Transaction[]
  isLoading?: boolean
  onSelectTransaction?: (transaction: Transaction) => void
}

export function TransactionList({ transactions, isLoading, onSelectTransaction }: TransactionListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getCategoryLabel = (categoryValue: string) => {
    return CATEGORIES.find((c) => c.value === categoryValue)?.label || categoryValue
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Letzte Transaktionen</CardTitle>
        </CardHeader>
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

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Letzte Transaktionen</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Noch keine Transaktionen vorhanden
          </p>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
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
                      transaction.type === 'income' ? 'bg-primary/20' : 'bg-destructive/20'
                    )}
                  >
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="h-5 w-5 text-primary" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span
                        className={cn(
                          'inline-block h-2 w-2 rounded-full',
                          CATEGORY_COLORS[transaction.category] || 'bg-muted-foreground'
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
                    transaction.type === 'income' ? 'text-primary' : 'text-destructive'
                  )}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
