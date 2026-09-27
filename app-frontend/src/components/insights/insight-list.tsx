import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Insight } from '@/lib/insights'
import { cn } from '@/lib/utils'

interface InsightListProps {
  insights: Insight[]
}

const TONE_CLASS: Record<Insight['tone'], string> = {
  positive: 'bg-primary',
  negative: 'bg-destructive',
  neutral: 'bg-muted-foreground',
}

/** The few sentences that sum the month up. Renders nothing without any. */
export function InsightList({ insights }: InsightListProps) {
  if (insights.length === 0) return null

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>What stands out</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {insights.map((insight) => (
            <li key={insight.id} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-2 inline-block h-2 w-2 shrink-0 rounded-full',
                  TONE_CLASS[insight.tone],
                )}
                aria-hidden
              />
              <span className="text-sm leading-6">{insight.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
