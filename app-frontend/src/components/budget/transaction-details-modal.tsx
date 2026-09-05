import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Save, Trash2 } from 'lucide-react'
import { CATEGORIES, type Transaction } from '@/lib/types'
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
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [prevTransaction, setPrevTransaction] = useState(transaction)

  if (prevTransaction !== transaction) {
    setPrevTransaction(transaction)
    if (transaction) {
      setTitle(transaction.title)
      setNotes(transaction.notes)
      setAmount(String(transaction.amount))
      setCategory(transaction.category)
      setDate(transaction.date)
      setType(transaction.type)
      setIsEditing(false)
    }
  }

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault()
    if (!transaction || !title.trim() || !amount || !category || !date) return

    onUpdateTransaction({
      ...transaction,
      title: title.trim(),
      notes,
      amount: Number.parseFloat(amount),
      category,
      date,
      type,
    })
    setIsEditing(false)
    onOpenChange(false)
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Transaktion bearbeiten' : 'Transaktionsdetails'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Aktualisieren Sie die Angaben dieser Transaktion.' : 'Alle Details Ihrer Transaktion auf einen Blick.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="detail-type">Art</Label>
              <Select disabled={!isEditing} value={type} onValueChange={(value) => setType(value as 'income' | 'expense')}>
                <SelectTrigger id="detail-type" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Einnahme</SelectItem>
                  <SelectItem value="expense">Ausgabe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="detail-title">Titel</Label>
              <Input id="detail-title" disabled={!isEditing} value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="detail-notes">Beschreibung</Label>
              <Textarea id="detail-notes" disabled={!isEditing} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Keine Beschreibung" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="detail-amount">Betrag (€)</Label>
              <Input id="detail-amount" disabled={!isEditing} type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="detail-category">Kategorie</Label>
              <Select disabled={!isEditing} value={category} onValueChange={setCategory}>
                <SelectTrigger id="detail-category" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="detail-date">Datum</Label>
              <Input id="detail-date" disabled={!isEditing} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            {isEditing ? (
              <Button key="save" className="w-full" type="submit"><Save data-icon="inline-start" />Speichern</Button>
            ) : (
              <Button key="edit" className="w-full" type="button" onClick={() => setIsEditing(true)}><Pencil data-icon="inline-start" />Bearbeiten</Button>
            )}
            {!isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" type="button" variant="destructive-outline">
                    <Trash2 data-icon="inline-start" />Löschen
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
      </DialogContent>
    </Dialog>
  )
}
