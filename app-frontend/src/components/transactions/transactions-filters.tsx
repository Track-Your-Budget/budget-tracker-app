import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORIES, type Transaction } from '@/lib/types'

// Radix Select cannot represent "no value" with an empty string, so the
// "all" option of every dropdown uses this sentinel instead.
export const ALL = 'all'

export type TypeFilter = typeof ALL | Transaction['type']
export type PeriodFilter = typeof ALL | 'current-month' | 'last-2-months'

export interface Filters {
  search: string
  category: string
  type: TypeFilter
  period: PeriodFilter
}

interface TransactionsFiltersProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  filters: Filters
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  hasActiveFilters: boolean
  onResetFilters: () => void
}

export function TransactionsFilters({
  searchInput,
  onSearchInputChange,
  filters,
  onFilterChange,
  hasActiveFilters,
  onResetFilters,
}: TransactionsFiltersProps) {
  return (
    <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Titel oder Notizen durchsuchen…"
          aria-label="Transaktionen durchsuchen"
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex">
        <Select
          value={filters.category}
          onValueChange={(value) => onFilterChange('category', value)}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label="Kategorie">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Kategorien</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.type}
          onValueChange={(value) => onFilterChange('type', value as TypeFilter)}
        >
          <SelectTrigger className="w-full lg:w-40" aria-label="Art">
            <SelectValue placeholder="Art" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Einnahmen & Ausgaben</SelectItem>
            <SelectItem value="income">Nur Einnahmen</SelectItem>
            <SelectItem value="expense">Nur Ausgaben</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.period}
          onValueChange={(value) => onFilterChange('period', value as PeriodFilter)}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label="Zeitraum">
            <SelectValue placeholder="Zeitraum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Gesamter Zeitraum</SelectItem>
            <SelectItem value="current-month">Aktueller Monat</SelectItem>
            <SelectItem value="last-2-months">Letzte 2 Monate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onResetFilters} className="w-fit">
          <X /> Filter zurücksetzen
        </Button>
      )}
    </section>
  )
}
