import { useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { MonthView } from '@/components/insights/month-view'
import { PeriodNav } from '@/components/insights/period-nav'
import { PeriodToggle } from '@/components/insights/period-toggle'
import { YearView } from '@/components/insights/year-view'
import { formatMonthName, formatMonthYear } from '@/lib/format'
import {
  fromMonthKey,
  isMonthKey,
  isYearKey,
  shiftMonth,
  shiftYear,
  toMonthKey,
  toYearKey,
  yearOfMonth,
  type MonthKey,
  type Period,
  type YearKey,
} from '@/lib/insights'

export default function Insights() {
  // The selected period lives in the URL so the back button and shared links
  // land on the same view: "/insights" is the current month, "?month=2026-08"
  // a past month, "?year=2025" a year. Anything invalid or in the future
  // falls back to the current month.
  const [searchParams, setSearchParams] = useSearchParams()
  const now = new Date()
  const currentMonth = toMonthKey(now)
  const currentYear = toYearKey(now)

  const requestedYear = searchParams.get('year')
  const requestedMonth = searchParams.get('month')
  const year: YearKey | null =
    isYearKey(requestedYear) && requestedYear <= currentYear ? requestedYear : null
  const month: MonthKey =
    isMonthKey(requestedMonth) && requestedMonth <= currentMonth ? requestedMonth : currentMonth
  const period: Period = year ? 'year' : 'month'

  const selectMonth = (next: MonthKey) => {
    // Keep the URL clean for the default so "/insights" always means "now".
    setSearchParams(next === currentMonth ? {} : { month: next })
  }
  const selectYear = (next: YearKey) => setSearchParams({ year: next })
  const selectPeriod = (next: Period) => {
    if (next === period) return
    if (next === 'year') selectYear(yearOfMonth(month))
    // Back to months: stay inside the year that was on screen.
    else selectMonth(year === currentYear ? currentMonth : `${year}-12`)
  }

  const header =
    year !== null
      ? {
          title: year,
          description: `How this year compares with ${shiftYear(year, -1)}.`,
          nav: (
            <PeriodNav
              label={year}
              unit="year"
              onPrevious={() => selectYear(shiftYear(year, -1))}
              onNext={() => selectYear(shiftYear(year, 1))}
              nextDisabled={year >= currentYear}
            />
          ),
        }
      : {
          title: formatMonthYear(fromMonthKey(month)),
          description: `How this month compares with ${formatMonthName(fromMonthKey(shiftMonth(month, -1)))}.`,
          nav: (
            <PeriodNav
              label={formatMonthYear(fromMonthKey(month))}
              unit="month"
              onPrevious={() => selectMonth(shiftMonth(month, -1))}
              onNext={() => selectMonth(shiftMonth(month, 1))}
              nextDisabled={month >= currentMonth}
            />
          ),
        }

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Insights"
          eyebrowIcon={Sparkles}
          title={header.title}
          description={header.description}
          aside={
            <div className="flex flex-wrap items-center gap-3">
              <PeriodToggle value={period} onChange={selectPeriod} />
              {header.nav}
            </div>
          }
        />

        {year !== null ? (
          <YearView year={year} isCurrent={year === currentYear} />
        ) : (
          <MonthView month={month} isCurrent={month === currentMonth} />
        )}
      </div>
    </div>
  )
}
