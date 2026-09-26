import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OverviewCards } from '@/components/budget/overview-cards'
import { AddTransactionModal } from '@/components/budget/add-transaction-modal'
import { TransactionList } from '@/components/budget/transaction-list'
import { TransactionDetailsModal } from '@/components/budget/transaction-details-modal'
import { ExpenseChart } from '@/components/budget/expense-chart'
import { CategoryBreakdown } from '@/components/budget/category-breakdown'
import { useTransactionDetails } from '@/hooks/use-transaction-details'
import { useTransactionMutations } from '@/hooks/use-transaction-mutations'
import {
  fetchMonthlySummary,
  fetchMonthTransactions,
  fetchRecentTransactions,
} from '@/lib/api/transactions'
import { formatMonthYear } from '@/lib/format'
import type { MonthlyData, Transaction } from '@/lib/types'
import { monthBounds } from '@/lib/utils'

/** Rows shown in the "Letzte Transaktionen" card. */
const RECENT_COUNT = 8

/** Whether an API date ("YYYY-MM-DD") falls into the month the dashboard shows. */
function isInCurrentMonth(date: string): boolean {
  const { from, to } = monthBounds(new Date())
  return date >= from && date <= to
}

function sumByType(transactions: Transaction[]) {
  return transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += Number(t.amount)
      else acc.expenses += Number(t.amount)
      return acc
    },
    { income: 0, expenses: 0 },
  )
}

export default function BudgetDashboard() {
  // Current-month rows drive the overview cards and the category breakdown.
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([])
  // The newest RECENT_COUNT rows across all months drive the list card. It is
  // deliberately not month-scoped so the 1st of a month is not an empty card.
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const {
    selected: selectedTransaction,
    setSelected: setSelectedTransaction,
    isOpen: isDetailsOpen,
    setIsOpen: setIsDetailsOpen,
    open: openDetails,
  } = useTransactionDetails()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const [month, recent, summary] = await Promise.all([
          fetchMonthTransactions(new Date()),
          fetchRecentTransactions(RECENT_COUNT),
          fetchMonthlySummary(),
        ])
        if (cancelled) return
        setMonthTransactions(month)
        setRecentTransactions(recent)
        setMonthlyData(summary)
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // After a successful write, re-read the recent list from the server. That
  // keeps it at exactly RECENT_COUNT rows in server order without
  // re-implementing "which row moved up from position 9" here.
  const reloadRecent = useCallback(async () => {
    try {
      setRecentTransactions(await fetchRecentTransactions(RECENT_COUNT))
    } catch (error) {
      console.error('Failed to refresh recent transactions:', error)
    }
  }, [])

  const mutations = useTransactionMutations({
    onCreated: useCallback(
      (saved: Transaction) => {
        // Saved regardless, but only this month's rows belong in the totals.
        if (isInCurrentMonth(saved.date)) setMonthTransactions((prev) => [saved, ...prev])
        void reloadRecent()
      },
      [reloadRecent],
    ),
    onUpdated: useCallback(
      (saved: Transaction) => {
        // An edit can move a row into or out of the current month.
        setMonthTransactions((prev) => {
          const others = prev.filter((t) => t.id !== saved.id)
          return isInCurrentMonth(saved.date) ? [saved, ...others] : others
        })
        setRecentTransactions((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
        setSelectedTransaction(saved)
        void reloadRecent()
      },
      [reloadRecent, setSelectedTransaction],
    ),
    onDeleted: useCallback(
      (id: string) => {
        setMonthTransactions((prev) => prev.filter((t) => t.id !== id))
        // Drop it immediately, then let the refetch pull the next row up.
        setRecentTransactions((prev) => prev.filter((t) => t.id !== id))
        void reloadRecent()
      },
      [reloadRecent],
    ),
  })

  const now = new Date()
  const totals = sumByType(monthTransactions)
  const balance = totals.income - totals.expenses

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
              <span className="font-semibold text-primary capitalize">{formatMonthYear(now)}</span>
            </div>
            <AddTransactionModal onAddTransaction={mutations.create} />
          </div>
          <OverviewCards
            balance={balance}
            income={totals.income}
            expenses={totals.expenses}
            isLoading={isLoading}
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <TransactionList
            transactions={recentTransactions}
            isLoading={isLoading}
            groupByMonth
            onSelectTransaction={openDetails}
            headerAction={
              <Button asChild variant="secondary" size="sm" className="px-0">
                <Link to="/transactions">
                  Alle anzeigen <ArrowRight />
                </Link>
              </Button>
            }
          />
          <div className="space-y-8">
            <ExpenseChart data={monthlyData} isLoading={isLoading} />
            <CategoryBreakdown transactions={monthTransactions} isLoading={isLoading} />
          </div>
        </div>
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
