import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CATEGORIES, CATEGORY_COLORS, type Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CategoryBreakdownProps {
  transactions: Transaction[]
  isLoading?: boolean
}

export function CategoryBreakdown({ transactions, isLoading }: CategoryBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const getCategoryLabel = (categoryValue: string) => {
    return CATEGORIES.find((c) => c.value === categoryValue)?.label || categoryValue
  }

  // Calculate expenses by category
  const expensesByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      },
      {} as Record<string, number>
    )

  const totalExpenses = Object.values(expensesByCategory).reduce((a, b) => a + b, 0)

  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Ausgaben nach Kategorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
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
        <CardTitle>Ausgaben nach Kategorie</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedCategories.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Noch keine Ausgaben vorhanden
          </p>
        ) : (
          <div className="space-y-4">
            {sortedCategories.map(([category, amount]) => {
              const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-block h-3 w-3 rounded-full',
                          CATEGORY_COLORS[category] || 'bg-muted-foreground'
                        )}
                      />
                      <span>{getCategoryLabel(category)}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        CATEGORY_COLORS[category] || 'bg-muted-foreground'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
