import { useMemo } from 'react'
import { CategoryComparison } from '@/components/insights/category-comparison'
import { EmptyPeriod } from '@/components/insights/empty-period'
import { InsightList } from '@/components/insights/insight-list'
import { KpiCards } from '@/components/insights/kpi-cards'
import { TopExpenses } from '@/components/insights/top-expenses'
import { useInsightsData } from '@/hooks/use-insights-data'
import { fetchMonthInsights } from '@/lib/api/insights'
import { formatMonthName, formatMonthYear } from '@/lib/format'
import { buildMonthInsights, fromMonthKey, shiftMonth, type MonthKey } from '@/lib/insights'

interface MonthViewProps {
  month: MonthKey
  isCurrent: boolean
}

/** One month against the month before. */
export function MonthView({ month, isCurrent }: MonthViewProps) {
  const { data, isLoading } = useInsightsData(month, fetchMonthInsights)
  const previousLabel = formatMonthName(fromMonthKey(shiftMonth(month, -1)))
  const insights = useMemo(() => (data ? buildMonthInsights(data) : []), [data])
  const isEmpty = !isLoading && data !== null && data.totals.count === 0

  return (
    <>
      <section className="mb-8">
        <KpiCards
          totals={data?.totals}
          previous={data?.previous}
          previousLabel={previousLabel}
          isLoading={isLoading}
        />
      </section>

      {isEmpty ? (
        <EmptyPeriod label={formatMonthYear(fromMonthKey(month))} isCurrent={isCurrent} />
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
    </>
  )
}
