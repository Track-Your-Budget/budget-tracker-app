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

/** What the quick-add form collects; category and type are derived server-side. */
export type QuickTransactionInput = Omit<NewTransaction, 'category' | 'type'>

/** Answer of `POST /api/transactions/classify/`. */
export interface Classification {
  category: string
  type: Transaction['type']
  /** `null` when the model had no opinion and the server fell back to defaults. */
  confidence: { category: number; type: number } | null
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
 * Ask the server which category and type fit `title` + `notes`. Never throws
 * on model trouble: the server answers with a fallback and `source: 'fallback'`.
 */
export async function classifyTransaction(
  input: Pick<QuickTransactionInput, 'title' | 'notes'>,
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
