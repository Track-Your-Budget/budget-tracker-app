export interface Transaction {
  id: string
  title: string
  notes: string
  amount: number
  category: string
  date: string
  type: 'income' | 'expense'
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
}

export interface CurrentUser {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  image: string | null
  bio: string
}

export const CATEGORIES = [
  { value: 'gehalt', label: 'Gehalt' },
  { value: 'miete', label: 'Miete' },
  { value: 'lebensmittel', label: 'Lebensmittel' },
  { value: 'transport', label: 'Transport' },
  { value: 'unterhaltung', label: 'Unterhaltung' },
  { value: 'versicherung', label: 'Versicherung' },
  { value: 'sonstiges', label: 'Sonstiges' },
] as const

export const CATEGORY_COLORS: Record<string, string> = {
  gehalt: 'bg-primary',
  miete: 'bg-chart-4',
  lebensmittel: 'bg-chart-2',
  transport: 'bg-chart-3',
  unterhaltung: 'bg-chart-5',
  versicherung: 'bg-chart-1',
  sonstiges: 'bg-muted-foreground',
}

// Shape of a DRF limit/offset page, returned by GET /transactions/?limit=…
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
