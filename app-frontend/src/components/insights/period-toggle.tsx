import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Period } from '@/lib/insights'

interface PeriodToggleProps {
  value: Period
  onChange: (period: Period) => void
}

/** Month | Year switch for the insights page. */
export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as Period)}>
      <TabsList aria-label="Period">
        <TabsTrigger value="month">Month</TabsTrigger>
        <TabsTrigger value="year">Year</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
