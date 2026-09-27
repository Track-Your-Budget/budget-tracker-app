import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Period } from '@/lib/insights'

interface PeriodNavProps {
  /** What the pill shows, e.g. "September 2026" or "2026". */
  label: string
  unit: Period
  onPrevious: () => void
  onNext: () => void
  /** Set when stepping forward would leave the past, i.e. at the current period. */
  nextDisabled: boolean
}

/** "‹ September 2026 ›": step one period back or forward. */
export function PeriodNav({ label, unit, onPrevious, onNext, nextDisabled }: PeriodNavProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label={`Previous ${unit}`} onClick={onPrevious}>
        <ChevronLeft />
      </Button>
      <span className="min-w-40 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-center font-semibold capitalize text-primary">
        {label}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label={`Next ${unit}`}
        disabled={nextDisabled}
        onClick={onNext}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
