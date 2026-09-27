import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatCurrency, formatDate, getCategoryLabel } from '@/lib/format'
import { CATEGORY_COLORS, type Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TopExpensesProps {
  expenses: Transaction[]
  isLoading?: boolean
}

/** The month's largest single expenses, read-only; editing stays on the transactions page. */
export function TopExpenses({ expenses, isLoading }: TopExpensesProps) {
  const title = <CardTitle>Largest expenses</CardTitle>

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>{title}</CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50">
      <CardHeader>{title}</CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No expenses this month</p>
        ) : (
          <ol className="space-y-4">
            {expenses.map((expense, index) => {
              const CategoryIcon = getCategoryIcon(expense.category)
              return (
                <li key={expense.id} className="flex items-center justify-between gap-4 p-3">
                  <div className="flex items-center gap-4">
                    <span className="w-4 text-sm tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                      <CategoryIcon
                        className="h-5 w-5 text-white"
                        aria-label={getCategoryLabel(expense.category)}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{expense.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span
                          className={cn(
                            'inline-block h-2 w-2 rounded-full',
                            CATEGORY_COLORS[expense.category] || 'bg-muted-foreground',
                          )}
                        />
                        <span>{getCategoryLabel(expense.category)}</span>
                        <span>•</span>
                        <span>{formatDate(expense.date)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-semibold text-destructive">
                    -{formatCurrency(expense.amount)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
