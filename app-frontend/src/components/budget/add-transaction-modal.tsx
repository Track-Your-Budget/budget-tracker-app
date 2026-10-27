import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Check, Mic, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
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
import type { QuickTransactionInput } from '@/lib/api/transactions'
import type { QuickAddFormValues } from '@/lib/transaction-form'

interface AddTransactionModalProps {
  /**
   * Title, amount, date, category and type are derived server-side from `text`.
   * Resolves to whether it was saved; the dialog stays open otherwise.
   */
  onAddTransaction: (transaction: QuickTransactionInput) => Promise<boolean>
}

const emptyValues = (): QuickAddFormValues => ({
  text: '',
})

export function AddTransactionModal({ onAddTransaction }: AddTransactionModalProps) {
  const [open, setOpen] = useState(false)
  const form = useForm<QuickAddFormValues>({ defaultValues: emptyValues() })

  const handleSubmit = async (values: QuickAddFormValues) => {
    const saved = await onAddTransaction({ text: values.text.trim() })
    if (!saved) return
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
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
          >
            <div className="grid gap-4 py-4">
              {/* Title, amount and an optional date ("gestern") in one line;
                  the server picks them apart, no date means today. */}
              <FormField
                control={form.control}
                name="text"
                rules={{
                  validate: (value) =>
                    value.trim().length > 0 || 'Please describe the transaction.',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What and how much?</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Rewe 23,50 yesterday" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="grid grid-cols-2 gap-2">
              {/* Voice entry: placeholder, recording is not wired up yet. */}
              <Button type="button" variant="outline" className="gap-2">
                <Mic className="size-4" />
                Record by voice
              </Button>
              <Button type="submit" className="gap-2" disabled={form.formState.isSubmitting}>
                <Check className="size-4" />
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
