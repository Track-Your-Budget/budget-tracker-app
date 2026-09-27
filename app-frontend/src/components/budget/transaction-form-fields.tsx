import { useState } from 'react'
import type { Control, FieldValues, Path } from 'react-hook-form'
import { enGB } from 'date-fns/locale'
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/format'
import { todayIso } from '@/lib/transaction-form'
import { cn, parseLocalDate, toIsoDate } from '@/lib/utils'

/*
 * Fields shared by the add and the edit dialog so both look and behave the
 * same: a compact date row whose calendar floats in a popover, and a notes
 * textarea that folds away behind a chevron.
 */

interface DateFieldProps {
  /** ISO `yyyy-mm-dd`. */
  value: string
  onChange: (isoDate: string) => void
  disabled?: boolean
}

/** "Today, 27/09/2026" with a "Today" reset and a "Change" popover calendar. */
export function DateField({ value, onChange, disabled = false }: DateFieldProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const isToday = value === todayIso()

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-md border border-input px-3 py-1.5 text-sm',
        disabled && 'opacity-60',
      )}
    >
      <span className="flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        {isToday ? `Today, ${formatDate(value)}` : formatDate(value)}
      </span>
      {!disabled && (
        <span className="flex items-center gap-1">
          {!isToday && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(todayIso())}>
              Today
            </Button>
          )}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="link" size="sm">
                Change
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                locale={enGB}
                selected={parseLocalDate(value)}
                defaultMonth={parseLocalDate(value)}
                onSelect={(day) => {
                  if (!day) return
                  onChange(toIsoDate(day))
                  setCalendarOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        </span>
      )}
    </div>
  )
}

interface NotesFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  disabled?: boolean
  /** Start expanded, e.g. when editing a row that already has notes. */
  defaultOpen?: boolean
}

/** Collapsible notes textarea; the header row toggles it with a chevron. */
export function NotesField<T extends FieldValues>({
  control,
  name,
  disabled = false,
  defaultOpen = false,
}: NotesFieldProps<T>) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md px-1 py-1 text-sm font-medium"
          aria-label={open ? 'Hide notes' : 'Show notes'}
        >
          <span>
            Notes <span className="text-muted-foreground text-xs font-normal">(optional)</span>
          </span>
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <FormField
          control={control}
          name={name}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={disabled ? 'No notes' : 'Additional information…'}
                  rows={3}
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}
