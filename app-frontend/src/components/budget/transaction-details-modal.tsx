import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Save, Trash2 } from 'lucide-react'
import { CATEGORIES, type Transaction } from '@/lib/types'
import { toFormValues, type TransactionFormValues } from '@/lib/transaction-form'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface TransactionDetailsModalProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateTransaction: (transaction: Transaction) => void
  onDeleteTransaction: (id: string) => void
}

export function TransactionDetailsModal({
  transaction,
  open,
  onOpenChange,
  onUpdateTransaction,
  onDeleteTransaction,
}: TransactionDetailsModalProps) {
  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {/* Keyed on the transaction: selecting a different one remounts the
            form, so its defaults and edit mode start fresh. No state sync. */}
        <TransactionDetailsForm
          key={transaction.id}
          transaction={transaction}
          onOpenChange={onOpenChange}
          onUpdateTransaction={onUpdateTransaction}
          onDeleteTransaction={onDeleteTransaction}
        />
      </DialogContent>
    </Dialog>
  )
}

interface TransactionDetailsFormProps {
  transaction: Transaction
  onOpenChange: (open: boolean) => void
  onUpdateTransaction: (transaction: Transaction) => void
  onDeleteTransaction: (id: string) => void
}

function TransactionDetailsForm({
  transaction,
  onOpenChange,
  onUpdateTransaction,
  onDeleteTransaction,
}: TransactionDetailsFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const form = useForm<TransactionFormValues>({
    defaultValues: toFormValues(transaction),
  })

  const handleSave = (values: TransactionFormValues) => {
    onUpdateTransaction({
      ...transaction,
      title: values.title.trim(),
      notes: values.notes,
      amount: Number.parseFloat(values.amount),
      category: values.category,
      date: values.date,
      type: values.type,
    })
    setIsEditing(false)
    onOpenChange(false)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit transaction' : 'Transaction details'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Update the details of this transaction.'
            : 'All details of your transaction at a glance.'}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} noValidate>
          <div className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select disabled={!isEditing} value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <Input disabled={!isEditing} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea disabled={!isEditing} placeholder="No description" {...field} />
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
                  Number.parseFloat(value) > 0 || 'The amount must be greater than 0.',
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (€)</FormLabel>
                  <FormControl>
                    <Input disabled={!isEditing} type="number" min="0" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              rules={{ required: 'Please select a category.' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select disabled={!isEditing} value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              rules={{ required: 'Please select a date.' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input disabled={!isEditing} type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            {isEditing ? (
              <Button key="save" className="w-full" type="submit">
                <Save data-icon="inline-start" />
                Save
              </Button>
            ) : (
              <Button
                key="edit"
                className="w-full"
                type="button"
                onClick={() => setIsEditing(true)}
              >
                <Pencil data-icon="inline-start" />
                Edit
              </Button>
            )}
            {!isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" type="button" variant="destructive-outline">
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => {
                        onDeleteTransaction(transaction.id)
                        onOpenChange(false)
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}
