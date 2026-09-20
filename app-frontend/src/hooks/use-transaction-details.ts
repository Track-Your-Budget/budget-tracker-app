import { useCallback, useState } from 'react'
import type { Transaction } from '@/lib/types'

/** State for the details modal: which transaction is shown, and whether it is open. */
export function useTransactionDetails() {
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((transaction: Transaction) => {
    setSelected(transaction)
    setIsOpen(true)
  }, [])

  return { selected, setSelected, isOpen, setIsOpen, open }
}
