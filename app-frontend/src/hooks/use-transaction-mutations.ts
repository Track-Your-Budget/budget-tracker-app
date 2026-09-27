import { useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  classifyTransaction,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type QuickTransactionInput,
} from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { getCategoryLabel } from '@/lib/format'

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

  // Two requests on purpose: classify, then save. Keeping them apart means a
  // later "preview before saving" needs no backend change, and a failed save
  // never leaves a half-classified row behind.
  const create = useCallback(
    async (input: QuickTransactionInput) => {
      try {
        const verdict = await classifyTransaction({ title: input.title, notes: input.notes })
        const saved = await createTransaction({
          ...input,
          category: verdict.category,
          type: verdict.type,
        })
        onCreated?.(saved)
        if (verdict.source === 'ai') {
          notify(
            'Saved',
            `Filed as ${getCategoryLabel(saved.category)} (${saved.type}). Open it to correct.`,
          )
        } else {
          notify('Saved', 'Category could not be detected; filed as Miscellaneous.')
        }
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
