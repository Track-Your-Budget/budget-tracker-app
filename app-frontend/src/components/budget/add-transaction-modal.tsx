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
        <Button className="gap-2 px-3 py-2 text-base font-medium rounded-2xl">
          <Plus className="size-6" />
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
                    <FormLabel className="justify-center text-lg">What and how much?</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="e.g. Rewe 23,50 yesterday"
                          className="h-12 pl-4 pr-16 md:text-base border border-primary/50"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      {/* Voice entry: placeholder, recording is not wired up yet. */}
                      <div className="absolute inset-y-0 right-0 flex items-center border-l border-input px-1.5 ">
                        <button
                          className="hover:cursor-pointer px-2"
                          aria-label="Add by voice"
                          title="Add by voice"
                        >
                          <Mic className="size-7" />
                        </button>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full gap-2 text-base" disabled={form.formState.isSubmitting}>
                <Check className="size-6" />
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
