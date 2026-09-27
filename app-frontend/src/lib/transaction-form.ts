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

/**
 * What the quick-add form collects: category and type are not asked for, they
 * are derived from title + notes afterwards.
 */
export type QuickAddFormValues = Pick<TransactionFormValues, 'title' | 'amount' | 'date' | 'notes'>

/**
 * `"12,50"` and `"12.50"` both become `12.5`; anything unparsable becomes
 * `NaN`, which fails the form's `> 0` check.
 */
export function parseAmount(raw: string): number {
  return Number.parseFloat(raw.trim().replace(',', '.'))
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
