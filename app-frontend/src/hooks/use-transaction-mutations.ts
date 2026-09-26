import { useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type NewTransaction,
} from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'

interface MutationCallbacks {
  onCreated?: (transaction: Transaction) => void
  onUpdated?: (transaction: Transaction) => void
  onDeleted?: (id: string) => void
}

/**
 * Create / update / delete with the app's standard success and error toasts.
 * Pages pass callbacks to fold the server's response into their own state.
 */
export function useTransactionMutations({ onCreated, onUpdated, onDeleted }: MutationCallbacks) {
  const { toast } = useToast()

  const notify = useCallback(
    (title: string, description: string) => toast({ title, description }),
    [toast],
  )
  const fail = useCallback(
    (title: string, description: string) => toast({ title, description, variant: 'destructive' }),
    [toast],
  )

  const create = useCallback(
    async (transaction: NewTransaction) => {
      try {
        onCreated?.(await createTransaction(transaction))
        notify('Gespeichert', 'Die Transaktion wurde hinzugefügt.')
      } catch (error) {
        console.error('Error creating transaction:', error)
        fail('Speichern fehlgeschlagen', 'Die Transaktion konnte nicht gespeichert werden.')
      }
    },
    [onCreated, notify, fail],
  )

  const update = useCallback(
    async (transaction: Transaction) => {
      try {
        onUpdated?.(await updateTransaction(transaction))
        notify('Aktualisiert', 'Die Änderungen wurden übernommen.')
      } catch (error) {
        console.error('Error updating transaction:', error)
        fail('Aktualisieren fehlgeschlagen', 'Die Änderungen konnten nicht gespeichert werden.')
      }
    },
    [onUpdated, notify, fail],
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteTransaction(id)
        onDeleted?.(id)
        notify('Gelöscht', 'Die Transaktion wurde entfernt.')
      } catch (error) {
        console.error('Error deleting transaction:', error)
        fail('Löschen fehlgeschlagen', 'Die Transaktion konnte nicht gelöscht werden.')
      }
    },
    [onDeleted, notify, fail],
  )

  return { create, update, remove }
}
