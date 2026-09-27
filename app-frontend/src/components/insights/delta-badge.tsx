import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

interface DeltaBadgeProps {
  /** The change to show; `null` when there is nothing to compare against. */
  change: number | null
  /** Whether an increase is good news (income) or bad news (spending). */
  goodWhen: 'up' | 'down'
  /** How to print the number. Defaults to a signed percentage of a fraction. */
  format?: (change: number) => string
  /** Rendered after the number in muted text, e.g. "vs August". */
  suffix?: string
  /** Shown instead of the number when `change` is null. */
  fallback?: string
  className?: string
}

/** Below this the change reads as flat: no arrow, no colour. */
const FLAT_THRESHOLD = 0.005

/** A coloured arrow plus number: green when the change is welcome, red when it is not. */
export function DeltaBadge({
  change,
  goodWhen,
  format = (value) => formatPercent(value, { signed: true }),
  suffix,
  fallback = 'No comparison',
  className,
}: DeltaBadgeProps) {
  if (change === null) {
    return <span className={cn('text-xs text-muted-foreground', className)}>{fallback}</span>
  }

  const flat = Math.abs(change) < FLAT_THRESHOLD
  const welcome = change > 0 === (goodWhen === 'up')
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight
  const tone = flat ? 'text-muted-foreground' : welcome ? 'text-primary' : 'text-destructive'

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', className)}>
      <span className={cn('inline-flex items-center gap-0.5', tone)}>
        <Icon className="size-3.5" aria-hidden />
        {format(flat ? 0 : change)}
      </span>
      {suffix && <span className="font-normal text-muted-foreground">{suffix}</span>}
    </span>
  )
}
