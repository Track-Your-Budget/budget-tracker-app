import { useState } from 'react'
import { BellRing, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface Threshold {
  id: string
  category: string
  limit: string
  spent: string
  color: string
}

const initialThresholds: Threshold[] = [
  { id: '1', category: 'Lebensmittel', limit: '450', spent: '312,40', color: 'bg-primary' },
  { id: '2', category: 'Unterhaltung', limit: '150', spent: '118,90', color: 'bg-chart-2' },
  { id: '3', category: 'Transport', limit: '220', spent: '89,00', color: 'bg-chart-3' },
  { id: '4', category: 'Wohnen', limit: '1.300', spent: '1.200,00', color: 'bg-chart-4' },
]

// German number strings use "." as thousands separator and "," as decimal.
function parseGermanNumber(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

export function ThresholdsTab() {
  const [thresholds, setThresholds] = useState<Threshold[]>(initialThresholds)
  const { toast } = useToast()

  const updateThreshold = (id: string, limit: string) => {
    setThresholds((current) =>
      current.map((item) => (item.id === id ? { ...item, limit } : item)),
    )
  }

  const saveThresholds = () =>
    toast({
      title: 'Limits gespeichert',
      description: 'Ihre Kategorie-Limits wurden aktualisiert.',
    })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Kategorie-Limits</CardTitle>
            <CardDescription>
              Definieren Sie monatliche Budgets und erhalten Sie eine Warnung vor dem Limit.
            </CardDescription>
          </div>
          <Button onClick={saveThresholds}>
            <Save /> Limits speichern
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {thresholds.map((threshold) => {
            const progress = Math.min(
              (parseGermanNumber(threshold.spent) /
                parseGermanNumber(threshold.limit)) *
                100,
              100,
            )
            return (
              <div
                key={threshold.id}
                className="flex flex-col gap-3 rounded-xl border p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{threshold.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {threshold.spent} € von {threshold.limit} € verwendet
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`limit-${threshold.id}`} className="sr-only">
                      Limit für {threshold.category}
                    </Label>
                    <Input
                      id={`limit-${threshold.id}`}
                      className="w-28 text-right"
                      value={threshold.limit}
                      onChange={(event) =>
                        updateThreshold(threshold.id, event.target.value)
                      }
                    />
                    <span className="text-sm text-muted-foreground">€ / Monat</span>
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
            <p className="font-medium">Benachrichtigungen aktiv</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Du erhältst eine Warnung, sobald 80 % eines Kategorie-Limits erreicht sind.
            </p>
          </div>
          <Switch
            defaultChecked
            className="ml-auto"
            aria-label="Schwellenwert-Benachrichtigungen"
          />
        </CardContent>
      </Card>
    </div>
  )
}
