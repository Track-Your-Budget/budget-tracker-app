import type { Transaction } from '@/lib/types'

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
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
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
