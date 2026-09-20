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
        <DialogTitle>{isEditing ? 'Transaktion bearbeiten' : 'Transaktionsdetails'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Aktualisieren Sie die Angaben dieser Transaktion.'
            : 'Alle Details Ihrer Transaktion auf einen Blick.'}
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
                  <FormLabel>Art</FormLabel>
                  <Select disabled={!isEditing} value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Einnahme</SelectItem>
                      <SelectItem value="expense">Ausgabe</SelectItem>
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
                validate: (value) => value.trim().length > 0 || 'Bitte geben Sie einen Titel ein.',
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel</FormLabel>
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
                  <FormLabel>Beschreibung</FormLabel>
                  <FormControl>
                    <Textarea disabled={!isEditing} placeholder="Keine Beschreibung" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              rules={{
                required: 'Bitte geben Sie einen Betrag ein.',
                validate: (value) =>
                  Number.parseFloat(value) > 0 || 'Der Betrag muss größer als 0 sein.',
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Betrag (€)</FormLabel>
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
              rules={{ required: 'Bitte wählen Sie eine Kategorie.' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategorie</FormLabel>
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
              rules={{ required: 'Bitte wählen Sie ein Datum.' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum</FormLabel>
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
                Speichern
              </Button>
            ) : (
              <Button
                key="edit"
                className="w-full"
                type="button"
                onClick={() => setIsEditing(true)}
              >
                <Pencil data-icon="inline-start" />
                Bearbeiten
              </Button>
            )}
            {!isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" type="button" variant="destructive-outline">
                    <Trash2 data-icon="inline-start" />
                    Löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Transaktion löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion kann nicht rückgängig gemacht werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => {
                        onDeleteTransaction(transaction.id)
                        onOpenChange(false)
                      }}
                    >
                      Löschen
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
