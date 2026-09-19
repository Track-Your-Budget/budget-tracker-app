import { Card, CardContent } from '@/components/ui/card'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

interface OverviewCardsProps {
  balance: number
  income: number
  expenses: number
  isLoading?: boolean
}

export function OverviewCards({ balance, income, expenses, isLoading }: OverviewCardsProps) {
  const cards = [
    {
      title: 'Gesamtsaldo',
      value: balance,
      icon: Wallet,
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      valueColor: balance >= 0 ? 'text-primary' : 'text-destructive',
    },
    {
      title: 'Einnahmen',
      value: income,
      icon: TrendingUp,
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
    },
    {
      title: 'Ausgaben',
      value: expenses,
      icon: TrendingDown,
      iconBg: 'bg-destructive/20',
      iconColor: 'text-destructive',
      valueColor: 'text-destructive',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                {isLoading ? (
                  <div className="h-8 w-32 animate-pulse rounded bg-muted" />
                ) : (
                  <p className={cn('text-2xl font-bold', card.valueColor)}>
                    {formatCurrency(card.value)}
                  </p>
                )}
              </div>
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full',
                  card.iconBg,
                )}
              >
                <card.icon className={cn('h-6 w-6', card.iconColor)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
