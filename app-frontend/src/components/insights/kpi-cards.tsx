import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { DeltaBadge } from '@/components/insights/delta-badge'
import type { PeriodTotals } from '@/lib/api/insights'
import { formatCurrency, formatSignedCurrency } from '@/lib/format'
import { relativeChange } from '@/lib/insights'
import { cn } from '@/lib/utils'

interface KpiCardsProps {
  totals?: PeriodTotals
  previous?: PeriodTotals
  /** Name of the comparison month, e.g. "August". */
  previousLabel: string
  isLoading?: boolean
}

/** Balance, income and expenses of the month, each against the month before. */
export function KpiCards({ totals, previous, previousLabel, isLoading }: KpiCardsProps) {
  const ready = !isLoading && totals && previous
  // Balance moves around zero, so a percentage would be meaningless there;
  // it gets the difference in euros instead.
  const cards = [
    {
      title: 'Balance',
      value: totals?.balance ?? 0,
      icon: Wallet,
      iconClass:
        (totals?.balance ?? 0) >= 0
          ? 'bg-primary/20 text-primary'
          : 'bg-destructive/20 text-destructive',
      valueClass: (totals?.balance ?? 0) >= 0 ? 'text-primary' : 'text-destructive',
      change: ready && previous.count > 0 ? totals.balance - previous.balance : null,
      goodWhen: 'up' as const,
      format: formatSignedCurrency,
    },
    {
      title: 'Income',
      value: totals?.income ?? 0,
      icon: TrendingUp,
      iconClass: 'bg-primary/20 text-primary',
      valueClass: 'text-primary',
      change: ready ? relativeChange(totals.income, previous.income) : null,
      goodWhen: 'up' as const,
      format: undefined,
    },
    {
      title: 'Expenses',
      value: totals?.expense ?? 0,
      icon: TrendingDown,
      iconClass: 'bg-destructive/20 text-destructive',
      valueClass: 'text-destructive',
      change: ready ? relativeChange(totals.expense, previous.expense) : null,
      goodWhen: 'down' as const,
      format: undefined,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                {isLoading ? (
                  <>
                    <div className="h-8 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </>
                ) : (
                  <>
                    <p className={cn('text-2xl font-bold', card.valueClass)}>
                      {formatCurrency(card.value)}
                    </p>
                    <DeltaBadge
                      change={card.change}
                      goodWhen={card.goodWhen}
                      format={card.format}
                      suffix={`vs ${previousLabel}`}
                      fallback={`No data for ${previousLabel}`}
                    />
                  </>
                )}
              </div>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  card.iconClass,
                )}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
