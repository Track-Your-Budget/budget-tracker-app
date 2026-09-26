import { useCallback, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { TransactionsHeader } from '@/components/transactions/transactions-header'
import { TransactionFilters } from '@/components/budget/transaction-filters'
import { TransactionList } from '@/components/budget/transaction-list'
import { TransactionDetailsModal } from '@/components/budget/transaction-details-modal'
import { useToast } from '@/hooks/use-toast'
import { useTransactionDetails } from '@/hooks/use-transaction-details'
import { useTransactionMutations } from '@/hooks/use-transaction-mutations'
import { fetchTransactionPage } from '@/lib/api/transactions'
import {
  DEFAULT_FILTERS,
  hasActiveFilters,
  toTransactionQuery,
  type TransactionFilters as Filters,
} from '@/lib/transaction-filters'
import type { Transaction } from '@/lib/types'
import { sortNewestFirst } from '@/lib/utils'

/** Rows per request: the first render and every "weitere laden" click. */
const PAGE_SIZE = 10
/** How long typing may pause before the search request fires. */
const SEARCH_DEBOUNCE_MS = 300

export default function Transactions() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  // The search box updates immediately; `filters.search` follows after the debounce.
  const [searchInput, setSearchInput] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const {
    selected: selectedTransaction,
    setSelected: setSelectedTransaction,
    isOpen: isDetailsOpen,
    setIsOpen: setIsDetailsOpen,
    open: openDetails,
  } = useTransactionDetails()
  const { toast } = useToast()

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }))
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  // First page: re-run whenever a filter changes and drop what was loaded
  // before, because the old offsets mean nothing against a new result set.
  useEffect(() => {
    let cancelled = false
    const loadFirstPage = async () => {
      setIsLoading(true)
      try {
        const page = await fetchTransactionPage(toTransactionQuery(filters), PAGE_SIZE, 0)
        if (cancelled) return
        setTransactions(page.results)
        setTotalCount(page.count)
        setHasMore(page.next !== null)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load transactions:', error)
        toast({
          title: 'Fehler',
          description: 'Transaktionen konnten nicht geladen werden.',
          variant: 'destructive',
        })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadFirstPage()
    return () => {
      cancelled = true
    }
  }, [filters, toast])

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true)
    try {
      // Offset by what is on screen rather than by page number, so a row
      // deleted in between does not make the next page skip one.
      const page = await fetchTransactionPage(
        toTransactionQuery(filters),
        PAGE_SIZE,
        transactions.length,
      )
      setTransactions((prev) => {
        const known = new Set(prev.map((t) => t.id))
        return [...prev, ...page.results.filter((t) => !known.has(t.id))]
      })
      setTotalCount(page.count)
      setHasMore(page.next !== null)
    } catch (error) {
      console.error('Failed to load more transactions:', error)
      toast({
        title: 'Fehler',
        description: 'Weitere Transaktionen konnten nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [filters, transactions.length, toast])

  const mutations = useTransactionMutations({
    onUpdated: useCallback(
      (saved: Transaction) => {
        setTransactions((prev) => sortNewestFirst(prev.map((t) => (t.id === saved.id ? saved : t))))
        setSelectedTransaction(saved)
      },
      [setSelectedTransaction],
    ),
    onDeleted: useCallback((id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      setTotalCount((count) => Math.max(0, count - 1))
    }, []),
  })

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setSearchInput('')
    setFilters(DEFAULT_FILTERS)
  }, [])

  const filtersActive = hasActiveFilters({ ...filters, search: searchInput })
  const listTitle = isLoading
    ? 'Transaktionen'
    : `Transaktionen (${transactions.length} von ${totalCount})`

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <TransactionsHeader />

        <TransactionFilters
          filters={filters}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onFilterChange={updateFilter}
          showReset={filtersActive}
          onReset={resetFilters}
        />

        <TransactionList
          title={listTitle}
          transactions={transactions}
          isLoading={isLoading}
          groupByMonth
          onSelectTransaction={openDetails}
          emptyMessage={
            filtersActive
              ? 'Keine Transaktionen für die gewählten Filter gefunden'
              : 'Noch keine Transaktionen vorhanden'
          }
          footer={
            hasMore ? (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? <Spinner /> : <ChevronDown />}
                  {`${PAGE_SIZE} weitere laden`}
                </Button>
              </div>
            ) : null
          }
        />
      </div>

      <TransactionDetailsModal
        transaction={selectedTransaction}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdateTransaction={mutations.update}
        onDeleteTransaction={mutations.remove}
      />
    </div>
  )
}
