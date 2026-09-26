import { CATEGORIES, type CurrentUser } from '@/lib/types'
import { parseLocalDate } from '@/lib/utils'

const LOCALE = 'en-GB'

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
})

const wholeCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** `1234.5` → `"€1,234.50"` */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

/** `1234.5` → `"€1,235"`; for axis ticks where cents are noise. */
export function formatWholeCurrency(amount: number): string {
  return wholeCurrencyFormatter.format(amount)
}

/** `"2026-09-19"` → `"19/09/2026"` */
export function formatDate(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** `new Date(2026, 8, 19)` → `"September 2026"` */
export function formatMonthYear(date: Date): string {
  return date.toLocaleString(LOCALE, { month: 'long', year: 'numeric' })
}

/** `"lebensmittel"` → `"Groceries"`; unknown values pass through unchanged. */
export function getCategoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category
}

/** "Ada Lovelace", falling back to the username, then to the e-mail. */
export function formatUserName(
  user: Pick<CurrentUser, 'first_name' | 'last_name' | 'username' | 'email'>,
): string {
  const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return fullName || user.username || user.email || ''
}
