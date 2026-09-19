import type { TransactionQuery } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { toIsoDate } from '@/lib/utils'

/**
 * Radix Select cannot represent "no value" with an empty string, so the
 * "all" option of every dropdown uses this sentinel instead.
 */
export const ALL = 'all'

export type TypeFilter = typeof ALL | Transaction['type']
export type PeriodFilter = typeof ALL | 'current-month' | 'last-2-months'

export interface TransactionFilters {
  search: string
  category: string
  type: TypeFilter
  period: PeriodFilter
}

export const DEFAULT_FILTERS: TransactionFilters = {
  search: '',
  category: ALL,
  type: ALL,
  period: ALL,
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.category !== ALL ||
    filters.type !== ALL ||
    filters.period !== ALL
  )
}

/**
 * "Aktueller Monat" starts on the 1st of this month; "Letzte 2 Monate" on the
 * 1st of the previous month. Neither needs an upper bound.
 */
function periodStart(period: PeriodFilter, now: Date): string | undefined {
  if (period === ALL) return undefined
  const monthsBack = period === 'current-month' ? 0 : 1
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() - monthsBack, 1))
}

/** Turn the UI filter state into the query the API understands. */
export function toTransactionQuery(
  filters: TransactionFilters,
  now: Date = new Date(),
): TransactionQuery {
  const query: TransactionQuery = {}
  const search = filters.search.trim()
  if (search) query.search = search
  if (filters.category !== ALL) query.category = filters.category
  if (filters.type !== ALL) query.type = filters.type
  const dateFrom = periodStart(filters.period, now)
  if (dateFrom) query.date_from = dateFrom
  return query
}
