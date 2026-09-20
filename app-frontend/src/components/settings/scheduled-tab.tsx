import { useState } from 'react'
import { CalendarClock, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface ScheduledEntry {
  id: string
  title: string
  category: string
  amount: string
  cadence: string
  next: string
  active: boolean
}

const initialScheduled: ScheduledEntry[] = [
  {
    id: '1',
    title: 'Miete',
    category: 'Wohnen',
    amount: '1.200,00 €',
    cadence: 'Monatlich',
    next: '01.06.2026',
    active: true,
  },
  {
    id: '2',
    title: 'Netflix',
    category: 'Unterhaltung',
    amount: '17,99 €',
    cadence: 'Monatlich',
    next: '08.06.2026',
    active: true,
  },
  {
    id: '3',
    title: 'Versicherung',
    category: 'Versicherung',
    amount: '320,00 €',
    cadence: 'Vierteljährlich',
    next: '15.07.2026',
    active: false,
  },
]

export function ScheduledTab() {
  const [scheduled, setScheduled] = useState<ScheduledEntry[]>(initialScheduled)
  const { toast } = useToast()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Geplante Transaktionen</CardTitle>
          <CardDescription>
            Wiederkehrende Einnahmen und Ausgaben für eine bessere Planung.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {scheduled.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                  <CalendarClock className="size-4 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.category} · {item.cadence} · Nächster Termin {item.next}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <p className="font-semibold">{item.amount}</p>
                <Switch
                  checked={item.active}
                  onCheckedChange={(active) =>
                    setScheduled((current) =>
                      current.map((entry) => (entry.id === item.id ? { ...entry, active } : entry)),
                    )
                  }
                  aria-label={`${item.title} aktivieren`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${item.title} löschen`}
                  onClick={() =>
                    setScheduled((current) => current.filter((entry) => entry.id !== item.id))
                  }
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Button
        variant="outline"
        onClick={() =>
          toast({
            title: 'Neue geplante Transaktion',
            description: 'Das Formular für geplante Transaktionen ist vorbereitet.',
          })
        }
      >
        <Plus /> Geplante Transaktion hinzufügen <ChevronRight />
      </Button>
    </div>
  )
}
