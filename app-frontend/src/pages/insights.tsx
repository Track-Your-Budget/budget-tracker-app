import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { CategoryComparison } from '@/components/insights/category-comparison'
import { InsightList } from '@/components/insights/insight-list'
import { KpiCards } from '@/components/insights/kpi-cards'
import { MonthNav } from '@/components/insights/month-nav'
import { TopExpenses } from '@/components/insights/top-expenses'
import { useToast } from '@/hooks/use-toast'
import { fetchMonthInsights, type MonthInsights } from '@/lib/api/insights'
import { formatMonthName, formatMonthYear } from '@/lib/format'
import {
  buildInsights,
  fromMonthKey,
  isMonthKey,
  shiftMonth,
  toMonthKey,
  type MonthKey,
} from '@/lib/insights'

export default function Insights() {
  // The selected month lives in the URL (?month=2026-08) so the back button
  // and shared links land on the same view. Anything invalid or in the
  // future falls back to the current month.
  const [searchParams, setSearchParams] = useSearchParams()
  const currentMonth = toMonthKey(new Date())
  const requested = searchParams.get('month')
  const month: MonthKey =
    isMonthKey(requested) && requested <= currentMonth ? requested : currentMonth
  const previousLabel = formatMonthName(fromMonthKey(shiftMonth(month, -1)))

  const [data, setData] = useState<MonthInsights | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const result = await fetchMonthInsights(month)
        if (!cancelled) setData(result)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load insights:', error)
        toast({
          title: 'Loading failed',
          description: 'The insights could not be loaded.',
          variant: 'destructive',
        })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [month, toast])

  const insights = useMemo(() => (data ? buildInsights(data) : []), [data])

  const selectMonth = (next: MonthKey) => {
    // Keep the URL clean for the default so "/insights" always means "now".
    setSearchParams(next === currentMonth ? {} : { month: next })
  }

  const isEmpty = !isLoading && data !== null && data.totals.count === 0

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Insights"
          eyebrowIcon={Sparkles}
          title={formatMonthYear(fromMonthKey(month))}
          description={`How this month compares with ${previousLabel}.`}
          aside={<MonthNav month={month} max={currentMonth} onChange={selectMonth} />}
        />

        <section className="mb-8">
          <KpiCards
            totals={data?.totals}
            previous={data?.previous}
            previousLabel={previousLabel}
            isLoading={isLoading}
          />
        </section>

        {isEmpty ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">
                No transactions in {formatMonthYear(fromMonthKey(month))}.
              </p>
              {month === currentMonth && (
                <Button asChild variant="secondary">
                  <Link to="/">Add one on the dashboard</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <InsightList insights={insights} />
            <div className="grid gap-8 lg:grid-cols-2">
              <CategoryComparison
                categories={data?.categories ?? []}
                totalExpense={data?.totals.expense ?? 0}
                previousLabel={previousLabel}
                isLoading={isLoading}
              />
              <TopExpenses expenses={data?.top_expenses ?? []} isLoading={isLoading} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
