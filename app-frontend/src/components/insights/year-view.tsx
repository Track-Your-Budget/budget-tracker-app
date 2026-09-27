import { useMemo } from 'react'
import { ExpenseChart } from '@/components/budget/expense-chart'
import { CategoryComparison } from '@/components/insights/category-comparison'
import { EmptyPeriod } from '@/components/insights/empty-period'
import { InsightList } from '@/components/insights/insight-list'
import { KpiCards } from '@/components/insights/kpi-cards'
import { TopExpenses } from '@/components/insights/top-expenses'
import { useInsightsData } from '@/hooks/use-insights-data'
import { fetchYearInsights } from '@/lib/api/insights'
import { formatMonthShort } from '@/lib/format'
import { buildYearInsights, fromMonthKey, shiftYear, type YearKey } from '@/lib/insights'
import type { MonthlyData } from '@/lib/types'

interface YearViewProps {
  year: YearKey
  isCurrent: boolean
}

/** One year against the year before, with a bar per month. */
export function YearView({ year, isCurrent }: YearViewProps) {
  const { data, isLoading } = useInsightsData(year, fetchYearInsights)
  const previousLabel = shiftYear(year, -1)
  const insights = useMemo(() => (data ? buildYearInsights(data) : []), [data])
  // Same shape the dashboard chart already draws, one bar per month.
  const chartData = useMemo<MonthlyData[]>(
    () =>
      (data?.months ?? []).map((m) => ({
        month: formatMonthShort(fromMonthKey(m.month)),
        income: m.income,
        expense: m.expense,
      })),
    [data],
  )
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
        <EmptyPeriod label={year} isCurrent={isCurrent} />
      ) : (
        <div className="space-y-8">
          <ExpenseChart title="Month by month" data={chartData} isLoading={isLoading} />
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
