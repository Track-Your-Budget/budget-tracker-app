import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { DateField, NotesField } from '@/components/budget/transaction-form-fields'
import type { QuickTransactionInput } from '@/lib/api/transactions'
import { parseAmount, todayIso, type QuickAddFormValues } from '@/lib/transaction-form'

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
  const form = useForm<QuickAddFormValues>({ defaultValues: emptyValues() })

  const handleSubmit = (values: QuickAddFormValues) => {
    onAddTransaction({
      title: values.title.trim(),
      amount: parseAmount(values.amount),
      date: values.date,
      notes: values.notes.trim(),
    })
    form.reset(emptyValues())
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(emptyValues())
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
          {/* key resets the collapsed notes field together with the values */}
          <form
            key={open ? 'open' : 'closed'}
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
          >
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <DateField value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <NotesField control={form.control} name="notes" />
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
