import type { Transaction } from '@/lib/types'
import { toIsoDate } from '@/lib/utils'

/**
 * Shape the transaction form works with. Amount stays a string because that is
 * what an <input> yields; it is parsed once on submit.
 */
export interface TransactionFormValues {
  type: Transaction['type']
  title: string
  amount: string
  category: string
  date: string
  notes: string
}

/** Today as `yyyy-mm-dd`, the value format of `<input type="date">`. */
export function todayIso(): string {
  return toIsoDate(new Date())
}

export function toFormValues(transaction: Transaction): TransactionFormValues {
  return {
    type: transaction.type,
    title: transaction.title,
    amount: String(transaction.amount),
    category: transaction.category,
    date: transaction.date,
    notes: transaction.notes,
  }
}
