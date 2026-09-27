import apiClient from '@/lib/api-client'
import type { Transaction } from '@/lib/types'

/** Totals of one calendar month; amounts are positive, balance may not be. */
export interface PeriodTotals {
  income: number
  expense: number
  balance: number
  /** Number of transactions, so an empty month is distinguishable from an all-zero one. */
  count: number
}

/** Expense sum of one category this month and the month before. */
export interface CategoryComparison {
  category: string
  amount: number
  previous_amount: number
}

/** Answer of `GET /api/insights/month/`. Months are spelled "YYYY-MM". */
export interface MonthInsights {
  month: string
  totals: PeriodTotals
  previous: PeriodTotals & { month: string }
  /** Sorted by `amount` descending; categories with spending only last month come last with amount 0. */
  categories: CategoryComparison[]
  /** The largest expenses of the month, largest first. */
  top_expenses: Transaction[]
}

/** One calendar month inside a year answer. */
export interface MonthTotals extends PeriodTotals {
  month: string
}

/** Answer of `GET /api/insights/year/`. Years are spelled "YYYY". */
export interface YearInsights {
  year: string
  totals: PeriodTotals
  previous: PeriodTotals & { year: string }
  /** Always twelve entries, January to December, zero-filled. */
  months: MonthTotals[]
  /** Same shape and order as in the month answer, compared with the previous year. */
  categories: CategoryComparison[]
  top_expenses: Transaction[]
}

export async function fetchMonthInsights(month: string): Promise<MonthInsights> {
  const response = await apiClient.get<MonthInsights>('/insights/month/', { params: { month } })
  return response.data
}

export async function fetchYearInsights(year: string): Promise<YearInsights> {
  const response = await apiClient.get<YearInsights>('/insights/year/', { params: { year } })
  return response.data
}
