import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Backend dates arrive as plain "YYYY-MM-DD" with no time component. Passing
// that straight to `new Date()` parses it as UTC midnight, which shifts to
// the previous calendar day once read back with local-time getters/formatters
// in any timezone west of UTC. Building the Date from local parts instead
// keeps the calendar day stable regardless of the viewer's timezone.
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Inverse of parseLocalDate: format a local Date as the "YYYY-MM-DD" the API
// expects, without toISOString(), which would shift the day west of UTC.
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Inclusive first and last day of the month that contains `date`.
export function monthBounds(date: Date): { from: string; to: string } {
  return {
    from: toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  }
}

// Mirror of the server ordering (-date, -id) so locally edited rows land
// where a fresh fetch would put them.
export function sortNewestFirst<T extends { id: string; date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byDate = parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
    return byDate !== 0 ? byDate : Number(b.id) - Number(a.id)
  })
}
