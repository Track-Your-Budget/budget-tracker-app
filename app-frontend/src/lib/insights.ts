import type { MonthInsights } from '@/lib/api/insights'
import { formatCurrency, formatMonthName, formatPercent, getCategoryLabel } from '@/lib/format'

/** A month as the API and the URL spell it: "YYYY-MM". Sorts correctly as a plain string. */
export type MonthKey = string

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/

export function isMonthKey(value: string | null | undefined): value is MonthKey {
  return value != null && MONTH_KEY.test(value)
}

export function toMonthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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
const MAX_INSIGHTS = 4

/**
 * Turn the month's numbers into a few plain sentences. Pure and rule-based:
 * every sentence is backed by a comparison the user can verify on the same
 * page. Returns nothing for a month without transactions.
 */
export function buildInsights(data: MonthInsights): Insight[] {
  const { totals, previous, categories } = data
  if (totals.count === 0) return []

  const previousName = formatMonthName(fromMonthKey(previous.month))
  const insights: Insight[] = []

  // Did the month end in the black?
  if (totals.balance > 0 && totals.income > 0) {
    insights.push({
      id: 'balance',
      tone: 'positive',
      text: `You kept ${formatCurrency(totals.balance)} of your income, a savings rate of ${formatPercent(totals.balance / totals.income)}.`,
    })
  } else if (totals.balance < 0) {
    insights.push({
      id: 'balance',
      tone: 'negative',
      text: `You spent ${formatCurrency(-totals.balance)} more than you earned.`,
    })
  }

  // Total spending against last month.
  const spendingChange = relativeChange(totals.expense, previous.expense)
  if (spendingChange !== null && totals.expense > 0) {
    if (Math.abs(spendingChange) < FLAT_THRESHOLD) {
      insights.push({
        id: 'spending',
        tone: 'neutral',
        text: `Spending is about the same as in ${previousName}.`,
      })
    } else if (spendingChange > 0) {
      insights.push({
        id: 'spending',
        tone: 'negative',
        text: `Spending is ${formatPercent(spendingChange)} higher than in ${previousName}.`,
      })
    } else {
      insights.push({
        id: 'spending',
        tone: 'positive',
        text: `Spending is ${formatPercent(-spendingChange)} lower than in ${previousName}.`,
      })
    }
  }

  // Where did most of the money go? Categories arrive sorted by amount.
  const biggest = categories.find((c) => c.amount > 0)
  if (biggest && totals.expense > 0) {
    insights.push({
      id: 'biggest',
      tone: 'neutral',
      text: `${getCategoryLabel(biggest.category)} was the biggest expense at ${formatCurrency(biggest.amount)}, ${formatPercent(biggest.amount / totals.expense)} of all spending.`,
    })
  }

  // The category that moved most against last month, in euros.
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
  if (mover) {
    const label = getCategoryLabel(mover.category)
    if (mover.amount === 0) {
      insights.push({
        id: 'mover',
        tone: 'neutral',
        text: `Nothing spent on ${label} this month, after ${formatCurrency(mover.previous_amount)} in ${previousName}.`,
      })
    } else if (mover.change > 0) {
      insights.push({
        id: 'mover',
        tone: 'negative',
        text: `${label} rose ${formatPercent(mover.change)} compared with ${previousName}.`,
      })
    } else {
      insights.push({
        id: 'mover',
        tone: 'positive',
        text: `${label} fell ${formatPercent(-mover.change)} compared with ${previousName}.`,
      })
    }
  }

  return insights.slice(0, MAX_INSIGHTS)
}
