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

  const succeed = useCallback(
    (description: string) => toast({ title: 'Erfolg', description }),
    [toast],
  )
  const fail = useCallback(
    (description: string) => toast({ title: 'Fehler', description, variant: 'destructive' }),
    [toast],
  )

  const create = useCallback(
    async (transaction: NewTransaction) => {
      try {
        onCreated?.(await createTransaction(transaction))
        succeed('Transaktion wurde erfolgreich hinzugefügt.')
      } catch (error) {
        console.error('Error creating transaction:', error)
        fail('Transaktion konnte nicht gespeichert werden.')
      }
    },
    [onCreated, succeed, fail],
  )

  const update = useCallback(
    async (transaction: Transaction) => {
      try {
        onUpdated?.(await updateTransaction(transaction))
        succeed('Transaktion wurde aktualisiert.')
      } catch (error) {
        console.error('Error updating transaction:', error)
        fail('Transaktion konnte nicht aktualisiert werden.')
      }
    },
    [onUpdated, succeed, fail],
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteTransaction(id)
        onDeleted?.(id)
        succeed('Transaktion wurde gelöscht.')
      } catch (error) {
        console.error('Error deleting transaction:', error)
        fail('Transaktion konnte nicht gelöscht werden.')
      }
    },
    [onDeleted, succeed, fail],
  )

  return { create, update, remove }
}
