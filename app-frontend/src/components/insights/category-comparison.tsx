import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeltaBadge } from '@/components/insights/delta-badge'
import type { CategoryComparison as CategoryRow } from '@/lib/api/insights'
import { formatCurrency, getCategoryLabel } from '@/lib/format'
import { relativeChange } from '@/lib/insights'
import { CATEGORY_COLORS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CategoryComparisonProps {
  categories: CategoryRow[]
  /** Sum of all expenses this month; the bars are shares of it. */
  totalExpense: number
  /** Name of the comparison month, e.g. "August". */
  previousLabel: string
  isLoading?: boolean
}

/** Every expense category of the month with its share and its change against last month. */
export function CategoryComparison({
  categories,
  totalExpense,
  previousLabel,
  isLoading,
}: CategoryComparisonProps) {
  const title = <CardTitle>Spending by category</CardTitle>

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>{title}</CardHeader>
        <CardContent className="space-y-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
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
        {categories.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No expenses this month</p>
        ) : (
          <div className="space-y-5">
            {categories.map((row) => {
              const share = totalExpense > 0 ? (row.amount / totalExpense) * 100 : 0
              const color = CATEGORY_COLORS[row.category] || 'bg-muted-foreground'
              return (
                <div
                  key={row.category}
                  className={cn('space-y-2', row.amount === 0 && 'opacity-60')}
                >
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn('inline-block h-3 w-3 rounded-full', color)} />
                      <span>{getCategoryLabel(row.category)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DeltaBadge
                        change={relativeChange(row.amount, row.previous_amount)}
                        goodWhen="down"
                        fallback="new"
                      />
                      <span className="w-24 text-right font-medium">
                        {formatCurrency(row.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={cn('h-2 rounded-full transition-all', color)}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.previous_amount > 0
                      ? `${formatCurrency(row.previous_amount)} in ${previousLabel}`
                      : `Nothing in ${previousLabel}`}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
