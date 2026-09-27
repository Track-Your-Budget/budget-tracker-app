import type {
  CategoryComparison,
  MonthInsights,
  PeriodTotals,
  YearInsights,
} from '@/lib/api/insights'
import { formatCurrency, formatMonthName, formatPercent, getCategoryLabel } from '@/lib/format'

/** A month as the API and the URL spell it: "YYYY-MM". Sorts correctly as a plain string. */
export type MonthKey = string
/** A year as the API and the URL spell it: "YYYY". */
export type YearKey = string

export type Period = 'month' | 'year'

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/
const YEAR_KEY = /^\d{4}$/

export function isMonthKey(value: string | null | undefined): value is MonthKey {
  return value != null && MONTH_KEY.test(value)
}

export function isYearKey(value: string | null | undefined): value is YearKey {
  return value != null && YEAR_KEY.test(value)
}

export function toMonthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function toYearKey(date: Date): YearKey {
  return String(date.getFullYear())
}

/** First day of the month as a local Date, safe to hand to the formatters. */
export function fromMonthKey(key: MonthKey): Date {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

export function shiftMonth(key: MonthKey, months: number): MonthKey {
  const date = fromMonthKey(key)
  return toMonthKey(new Date(date.getFullYear(), date.getMonth() + months, 1))
}

export function shiftYear(key: YearKey, years: number): YearKey {
  return String(Number(key) + years)
}

/** `"2026-09"` → `"2026"` */
export function yearOfMonth(key: MonthKey): YearKey {
  return key.slice(0, 4)
}

/**
 * Change from `previous` to `current` as a fraction (0.12 = up 12 %).
 * `null` when there is no base to compare against, which the UI shows as
 * "no data" rather than as an infinite increase.
 */
export function relativeChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return (current - previous) / previous
}

export interface Insight {
  id: string
  text: string
  /** Colours the marker: good news, bad news, or just a fact. */
  tone: 'positive' | 'negative' | 'neutral'
}

/** Below this relative change spending counts as "about the same". */
const FLAT_THRESHOLD = 0.05
/** A category must move this much, relatively and in euros, to earn a sentence. */
const CATEGORY_MIN_CHANGE = 0.15
const CATEGORY_MIN_AMOUNT = 10
const MAX_INSIGHTS = 5

// The sentences below are pure and rule-based: every one is backed by a
// comparison the user can verify on the same page. `periodName` is how the
// sentence refers to the period under review ("this month", "in 2026").

function balanceInsight(totals: PeriodTotals, periodName: string): Insight | null {
  if (totals.balance > 0 && totals.income > 0) {
    return {
      id: 'balance',
      tone: 'positive',
      text: `You kept ${formatCurrency(totals.balance)} of your income ${periodName}, a savings rate of ${formatPercent(totals.balance / totals.income)}.`,
    }
  }
  if (totals.balance < 0) {
    return {
      id: 'balance',
      tone: 'negative',
      text: `You spent ${formatCurrency(-totals.balance)} more than you earned ${periodName}.`,
    }
  }
  return null
}

function spendingInsight(
  totals: PeriodTotals,
  previous: PeriodTotals,
  previousName: string,
): Insight | null {
  const change = relativeChange(totals.expense, previous.expense)
  if (change === null || totals.expense === 0) return null
  if (Math.abs(change) < FLAT_THRESHOLD) {
    return {
      id: 'spending',
      tone: 'neutral',
      text: `Spending is about the same as in ${previousName}.`,
    }
  }
  return change > 0
    ? {
        id: 'spending',
        tone: 'negative',
        text: `Spending is ${formatPercent(change)} higher than in ${previousName}.`,
      }
    : {
        id: 'spending',
        tone: 'positive',
        text: `Spending is ${formatPercent(-change)} lower than in ${previousName}.`,
      }
}

function biggestCategoryInsight(
  categories: CategoryComparison[],
  totals: PeriodTotals,
): Insight | null {
  // Categories arrive sorted by amount, largest first.
  const biggest = categories.find((c) => c.amount > 0)
  if (!biggest || totals.expense === 0) return null
  return {
    id: 'biggest',
    tone: 'neutral',
    text: `${getCategoryLabel(biggest.category)} was the biggest expense at ${formatCurrency(biggest.amount)}, ${formatPercent(biggest.amount / totals.expense)} of all spending.`,
  }
}

/** The category that moved most against the previous period, in euros. */
function categoryMoverInsight(
  categories: CategoryComparison[],
  periodName: string,
  previousName: string,
): Insight | null {
  const mover = categories
    .filter((c) => c.previous_amount > 0)
    .map((c) => ({ ...c, change: (c.amount - c.previous_amount) / c.previous_amount }))
    .filter(
      (c) =>
        Math.abs(c.change) >= CATEGORY_MIN_CHANGE &&
        Math.abs(c.amount - c.previous_amount) >= CATEGORY_MIN_AMOUNT,
    )
    .sort(
      (a, b) => Math.abs(b.amount - b.previous_amount) - Math.abs(a.amount - a.previous_amount),
    )[0]
  if (!mover) return null

  const label = getCategoryLabel(mover.category)
  if (mover.amount === 0) {
    return {
      id: 'mover',
      tone: 'neutral',
      text: `Nothing spent on ${label} ${periodName}, after ${formatCurrency(mover.previous_amount)} in ${previousName}.`,
    }
  }
  return mover.change > 0
    ? {
        id: 'mover',
        tone: 'negative',
        text: `${label} rose ${formatPercent(mover.change)} compared with ${previousName}.`,
      }
    : {
        id: 'mover',
        tone: 'positive',
        text: `${label} fell ${formatPercent(-mover.change)} compared with ${previousName}.`,
      }
}

function compact(insights: (Insight | null)[]): Insight[] {
  return insights.filter((i): i is Insight => i !== null).slice(0, MAX_INSIGHTS)
}

/** The month's numbers as a few plain sentences; empty for a month without transactions. */
export function buildMonthInsights(data: MonthInsights): Insight[] {
  const { totals, previous, categories } = data
  if (totals.count === 0) return []
  const previousName = formatMonthName(fromMonthKey(previous.month))
  return compact([
    balanceInsight(totals, 'this month'),
    spendingInsight(totals, previous, previousName),
    biggestCategoryInsight(categories, totals),
    categoryMoverInsight(categories, 'this month', previousName),
  ])
}

/** The year's numbers as a few plain sentences; empty for a year without transactions. */
export function buildYearInsights(data: YearInsights): Insight[] {
  const { totals, previous, months, categories } = data
  if (totals.count === 0) return []
  const periodName = `in ${data.year}`
  const active = months.filter((m) => m.count > 0)

  // Averages over the months that have data, not over twelve: the current
  // year is usually unfinished and an empty month would drag them down.
  const average: Insight | null =
    active.length > 1 && totals.expense > 0
      ? {
          id: 'average',
          tone: 'neutral',
          text: `On average you spent ${formatCurrency(totals.expense / active.length)} per month over ${active.length} months.`,
        }
      : null

  const spenders = active.filter((m) => m.expense > 0)
  const peak =
    spenders.length > 1 ? spenders.reduce((max, m) => (m.expense > max.expense ? m : max)) : null
  const peakInsight: Insight | null = peak
    ? {
        id: 'peak',
        tone: 'neutral',
        text: `${formatMonthName(fromMonthKey(peak.month))} was the most expensive month at ${formatCurrency(peak.expense)}.`,
      }
    : null

  const best =
    active.length > 1 ? active.reduce((max, m) => (m.balance > max.balance ? m : max)) : null
  const bestInsight: Insight | null =
    best && best.balance > 0
      ? {
          id: 'best',
          tone: 'positive',
          text: `${formatMonthName(fromMonthKey(best.month))} was your best month, with ${formatCurrency(best.balance)} left over.`,
        }
      : null

  return compact([
    balanceInsight(totals, periodName),
    spendingInsight(totals, previous, previous.year),
    average,
    biggestCategoryInsight(categories, totals),
    peakInsight,
    bestInsight,
  ])
}
