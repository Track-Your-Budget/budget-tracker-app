import { useCallback } from 'react'
import axios from 'axios'
import { useToast } from '@/hooks/use-toast'
import {
  classifyTransaction,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type QuickTransactionInput,
} from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate, getCategoryLabel } from '@/lib/format'
import { todayIso } from '@/lib/transaction-form'

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
  // Resolves to whether the row was saved, so the form can stay open otherwise.
  const create = useCallback(
    async (input: QuickTransactionInput): Promise<boolean> => {
      try {
        const today = todayIso()
        const verdict = await classifyTransaction({ text: input.text, today })
        const saved = await createTransaction({
          title: verdict.title,
          amount: verdict.amount,
          date: verdict.date,
          // The typed line stays visible in the details, so a wrong split can be fixed.
          notes: input.text,
          category: verdict.category,
          type: verdict.type,
        })
        onCreated?.(saved)
        // Only name the date when it came from the text, so it can be checked.
        const when = saved.date === today ? '' : `, ${formatDate(saved.date)}`
        const parsed = `${saved.title}, ${formatCurrency(saved.amount)}${when}`
        if (verdict.source === 'ai') {
          notify(
            'Saved',
            `${parsed}: filed as ${getCategoryLabel(saved.category)} (${saved.type}). Open it to correct.`,
          )
        } else {
          notify('Saved', `${parsed}: category could not be detected; filed as Miscellaneous.`)
        }
        return true
      } catch (error) {
        // The server could not find an amount (or a title) in the text.
        const textError = axios.isAxiosError(error) ? error.response?.data?.text?.[0] : undefined
        if (textError) {
          fail('Check your entry', textError)
          return false
        }
        console.error('Error creating transaction:', error)
        fail('Save failed', 'The transaction could not be saved.')
        return false
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
