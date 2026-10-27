import apiClient from '@/lib/api-client'
import type { MonthlyData, PaginatedResponse, Transaction } from '@/lib/types'
import { monthBounds } from '@/lib/utils'

/** Query-string filters understood by `GET /api/transactions/`. */
export interface TransactionQuery {
  search?: string
  category?: string
  type?: Transaction['type']
  /** Inclusive ISO dates. */
  date_from?: string
  date_to?: string
}

export type NewTransaction = Omit<Transaction, 'id'>

/**
 * What the quick-add form collects. `text` holds title, amount and maybe a
 * date in one line ("Rewe 23,50 gestern"); the server splits it and derives
 * category and type. The line is saved unchanged as the notes.
 */
export type QuickTransactionInput = { text: string }

/** Answer of `POST /api/transactions/classify/`. */
export interface Classification {
  /**
   * The word of `text` the model picked as title; without a model, `text`
   * minus amount and date phrase.
   */
  title: string
  amount: number
  /** ISO date; `today` when the text named none. */
  date: string
  category: string
  type: Transaction['type']
  /**
   * `null` when the model had no opinion and the server fell back to defaults.
   * `amount` / `date` are only there when the text held candidates to pick from.
   */
  confidence: { category: number; type: number; amount?: number; date?: number } | null
  source: 'ai' | 'fallback'
  model?: string
}

/** Plain array; used when the caller wants every row matching the query. */
export async function fetchTransactions(query: TransactionQuery = {}): Promise<Transaction[]> {
  const response = await apiClient.get<Transaction[]>('/transactions/', { params: query })
  return response.data
}

/** One limit/offset page; the server only wraps the response when `limit` is set. */
export async function fetchTransactionPage(
  query: TransactionQuery,
  limit: number,
  offset: number,
): Promise<PaginatedResponse<Transaction>> {
  const response = await apiClient.get<PaginatedResponse<Transaction>>('/transactions/', {
    params: { ...query, limit, offset },
  })
  return response.data
}

/** Every transaction of the month containing `month`. */
export function fetchMonthTransactions(month: Date): Promise<Transaction[]> {
  const { from, to } = monthBounds(month)
  return fetchTransactions({ date_from: from, date_to: to })
}

/** The newest `count` transactions across all months. */
export async function fetchRecentTransactions(count: number): Promise<Transaction[]> {
  const page = await fetchTransactionPage({}, count, 0)
  return page.results
}

/**
 * Let the server split `text` into title, amount and date and pick category
 * and type. `today` is the user's local date, so "gestern" means their
 * yesterday. Never throws on model trouble: the server answers with a
 * fallback and `source: 'fallback'`. A `text` without an amount is a 400 on
 * `text`.
 */
export async function classifyTransaction(
  input: QuickTransactionInput & { today: string },
): Promise<Classification> {
  const response = await apiClient.post<Classification>('/transactions/classify/', input)
  return response.data
}

export async function createTransaction(transaction: NewTransaction): Promise<Transaction> {
  const response = await apiClient.post<Transaction>('/transactions/', transaction)
  return response.data
}

export async function updateTransaction(transaction: Transaction): Promise<Transaction> {
  const response = await apiClient.put<Transaction>(`/transactions/${transaction.id}/`, transaction)
  return response.data
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiClient.delete(`/transactions/${id}/`)
}

export async function fetchMonthlySummary(): Promise<MonthlyData[]> {
  const response = await apiClient.get<MonthlyData[]>('/monthly-summary/')
  return response.data
}
