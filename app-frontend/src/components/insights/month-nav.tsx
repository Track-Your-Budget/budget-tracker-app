import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMonthYear } from '@/lib/format'
import { fromMonthKey, shiftMonth, type MonthKey } from '@/lib/insights'

interface MonthNavProps {
  month: MonthKey
  /** Latest month that can be selected, normally the current one. */
  max: MonthKey
  onChange: (month: MonthKey) => void
}

/** "‹ September 2026 ›": step one month back or forward, never past `max`. */
export function MonthNav({ month, max, onChange }: MonthNavProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-40 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-center font-semibold capitalize text-primary">
        {formatMonthYear(fromMonthKey(month))}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next month"
        disabled={month >= max}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
