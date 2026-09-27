import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { enGB } from 'date-fns/locale'
import { CalendarDays, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { QuickTransactionInput } from '@/lib/api/transactions'
import { formatDate } from '@/lib/format'
import { parseAmount, todayIso, type QuickAddFormValues } from '@/lib/transaction-form'
import { parseLocalDate, toIsoDate } from '@/lib/utils'

interface AddTransactionModalProps {
  /** Category and type are not part of the input; the server derives them. */
  onAddTransaction: (transaction: QuickTransactionInput) => void
}

const emptyValues = (): QuickAddFormValues => ({
  title: '',
  amount: '',
  date: todayIso(),
  notes: '',
})

export function AddTransactionModal({ onAddTransaction }: AddTransactionModalProps) {
  const [open, setOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  // Notes start collapsed; the user reveals the field on demand.
  const [showNotes, setShowNotes] = useState(false)
  const form = useForm<QuickAddFormValues>({ defaultValues: emptyValues() })

  const resetForm = () => {
    form.reset(emptyValues())
    setCalendarOpen(false)
    setShowNotes(false)
  }

  const handleSubmit = (values: QuickAddFormValues) => {
    onAddTransaction({
      title: values.title.trim(),
      amount: parseAmount(values.amount),
      date: values.date,
      notes: values.notes.trim(),
    })
    resetForm()
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm()
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 px-3 py-2">
          <Plus className="h-4 w-4" />
          Add transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New transaction</DialogTitle>
          <DialogDescription>
            A title and an amount are enough. Category and type are detected automatically, the date
            defaults to today.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="title"
                rules={{
                  validate: (value) => value.trim().length > 0 || 'Please enter a title.',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Groceries, Salary…" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                rules={{
                  required: 'Please enter an amount.',
                  validate: (value) =>
                    parseAmount(value) > 0 || 'The amount must be greater than 0.',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (€)</FormLabel>
                    <FormControl>
                      {/* Text + decimal keyboard instead of type="number": accepts
                          "12,50" as well as "12.50" and never scrolls the value. */}
                      <Input inputMode="decimal" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => {
                  const isToday = field.value === todayIso()
                  return (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-input px-3 py-1.5 text-sm">
                        <span className="flex items-center gap-2">
                          <CalendarDays className="size-4 text-muted-foreground" />
                          {isToday ? `Today, ${formatDate(field.value)}` : formatDate(field.value)}
                        </span>
                        <span className="flex items-center gap-1">
                          {!isToday && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => field.onChange(todayIso())}
                            >
                              Today
                            </Button>
                          )}
                          {/* The calendar floats above the form in its own
                              popover instead of pushing the fields down. */}
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
                                selected={parseLocalDate(field.value)}
                                defaultMonth={parseLocalDate(field.value)}
                                onSelect={(day) => {
                                  if (!day) return
                                  field.onChange(toIsoDate(day))
                                  setCalendarOpen(false)
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              {showNotes ? (
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Notes <span className="text-muted-foreground text-xs">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional information…"
                          rows={3}
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit px-2 text-muted-foreground"
                  onClick={() => setShowNotes(true)}
                >
                  <Plus /> Add a note
                </Button>
              )}
            </div>
            <DialogFooter className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
