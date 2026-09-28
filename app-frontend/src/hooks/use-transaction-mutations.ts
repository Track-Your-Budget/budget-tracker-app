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
        notify('Saved', 'The transaction was added.')
      } catch (error) {
        console.error('Error creating transaction:', error)
        fail('Save failed', 'The transaction could not be saved.')
      }
    },
    [onCreated, notify, fail],
  )

  const update = useCallback(
    async (transaction: Transaction) => {
      try {
        onUpdated?.(await updateTransaction(transaction))
        notify('Updated', 'Your changes were applied.')
      } catch (error) {
        console.error('Error updating transaction:', error)
        fail('Update failed', 'Your changes could not be saved.')
      }
    },
    [onUpdated, notify, fail],
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteTransaction(id)
        onDeleted?.(id)
        notify('Deleted', 'The transaction was removed.')
      } catch (error) {
        console.error('Error deleting transaction:', error)
        fail('Delete failed', 'The transaction could not be deleted.')
      }
    },
    [onDeleted, notify, fail],
  )

  return { create, update, remove }
}
