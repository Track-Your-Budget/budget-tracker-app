import { useState } from 'react'
import { BellRing, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/format'

interface Threshold {
  id: string
  category: string
  /** Monthly limit as typed into the input. */
  limit: string
  spent: number
  color: string
}

const initialThresholds: Threshold[] = [
  { id: '1', category: 'Groceries', limit: '450', spent: 312.4, color: 'bg-primary' },
  { id: '2', category: 'Entertainment', limit: '150', spent: 118.9, color: 'bg-chart-2' },
  { id: '3', category: 'Transport', limit: '220', spent: 89, color: 'bg-chart-3' },
  { id: '4', category: 'Housing', limit: '1300', spent: 1200, color: 'bg-chart-4' },
]

export function ThresholdsTab() {
  const [thresholds, setThresholds] = useState<Threshold[]>(initialThresholds)
  const { toast } = useToast()

  const updateThreshold = (id: string, limit: string) => {
    setThresholds((current) => current.map((item) => (item.id === id ? { ...item, limit } : item)))
  }

  const saveThresholds = () =>
    toast({
      title: 'Limits saved',
      description: 'Your category limits were updated.',
    })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Category limits</CardTitle>
            <CardDescription>
              Set monthly budgets and get a warning before you reach the limit.
            </CardDescription>
          </div>
          <Button onClick={saveThresholds}>
            <Save /> Save limits
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {thresholds.map((threshold) => {
            const limit = Number(threshold.limit)
            const progress = limit > 0 ? Math.min((threshold.spent / limit) * 100, 100) : 0
            return (
              <div key={threshold.id} className="flex flex-col gap-3 rounded-xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{threshold.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(threshold.spent)} of {formatCurrency(limit)} used
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`limit-${threshold.id}`} className="sr-only">
                      Limit for {threshold.category}
                    </Label>
                    <Input
                      id={`limit-${threshold.id}`}
                      type="number"
                      min="0"
                      step="1"
                      className="w-28 text-right"
                      value={threshold.limit}
                      onChange={(event) => updateThreshold(threshold.id, event.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">€ / month</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${threshold.color}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-5">
          <BellRing className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Notifications on</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You will be warned as soon as 80 % of a category limit is reached.
            </p>
          </div>
          <Switch defaultChecked className="ml-auto" aria-label="Limit notifications" />
        </CardContent>
      </Card>
    </div>
  )
}
