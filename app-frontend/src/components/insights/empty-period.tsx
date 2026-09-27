import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyPeriodProps {
  /** e.g. "September 2026" or "2026" */
  label: string
  /** Offer the dashboard link only when adding something would change this view. */
  isCurrent: boolean
}

export function EmptyPeriod({ label, isCurrent }: EmptyPeriodProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-muted-foreground">No transactions in {label}.</p>
        {isCurrent && (
          <Button asChild variant="secondary">
            <Link to="/">Add one on the dashboard</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
