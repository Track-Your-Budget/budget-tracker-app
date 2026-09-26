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
import { CATEGORIES } from '@/lib/types'
import {
  ALL,
  type PeriodFilter,
  type TransactionFilters as Filters,
  type TypeFilter,
} from '@/lib/transaction-filters'

interface TransactionFiltersProps {
  filters: Filters
  /** Live search text; may be ahead of `filters.search` while the debounce runs. */
  searchInput: string
  onSearchInputChange: (value: string) => void
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  showReset: boolean
  onReset: () => void
}

/** Search box plus the category / type / period dropdowns of the transactions page. */
export function TransactionFilters({
  filters,
  searchInput,
  onSearchInputChange,
  onFilterChange,
  showReset,
  onReset,
}: TransactionFiltersProps) {
  return (
    <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Search title or notes…"
          aria-label="Search transactions"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex">
        <Select value={filters.category} onValueChange={(v) => onFilterChange('category', v)}>
          <SelectTrigger className="w-full lg:w-44" aria-label="Category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(v) => onFilterChange('type', v as TypeFilter)}>
          <SelectTrigger className="w-full lg:w-40" aria-label="Type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Income & expenses</SelectItem>
            <SelectItem value="income">Income only</SelectItem>
            <SelectItem value="expense">Expenses only</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.period}
          onValueChange={(v) => onFilterChange('period', v as PeriodFilter)}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label="Period">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All time</SelectItem>
            <SelectItem value="current-month">This month</SelectItem>
            <SelectItem value="last-2-months">Last 2 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="w-fit">
          <X /> Reset filters
        </Button>
      )}
    </section>
  )
}
