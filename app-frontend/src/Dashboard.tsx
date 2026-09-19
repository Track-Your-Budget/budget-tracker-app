import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import apiClient from '@/lib/apiClient'
import { OverviewCards } from '@/components/budget/overview-cards'
import { AddTransactionModal } from '@/components/budget/add-transaction-modal'
import { TransactionList } from '@/components/budget/transaction-list'
import { TransactionDetailsModal } from '@/components/budget/transaction-details-modal'
import { ExpenseChart } from '@/components/budget/expense-chart'
import { CategoryBreakdown } from '@/components/budget/category-breakdown'
import type { Transaction, MonthlyData } from '@/lib/types'


//  API call 
async function fetchTransactions(): Promise<Transaction[]> {
  const response = await apiClient.get<Transaction[]>('/transactions/')
  return response.data
}

async function fetchMonthlyData(): Promise<MonthlyData[]> {
  const response = await apiClient.get<MonthlyData[]>('/monthly-summary/')
  return response.data
}

export default function BudgetDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const { toast } = useToast()

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [transactionsData, monthlyDataResult] = await Promise.all([
          fetchTransactions(),
          fetchMonthlyData(),
        ])
        setTransactions(transactionsData)
        setMonthlyData(monthlyDataResult)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate totals from current month's transactions only
  const now = new Date()
  const currentMonthTransactions = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const totals = currentMonthTransactions.reduce(
    (acc, t) => {
      const amount = Number(t.amount)
      if (t.type === 'income') {
        acc.income += amount
      } else {
        acc.expenses += amount
      }
      return acc
    },
    { income: 0, expenses: 0 }
  )

  const balance = totals.income - totals.expenses

  const handleAddTransaction = useCallback(async (newTransaction: Omit<Transaction, 'id'>) => {
    try {
      const response = await apiClient.post<Transaction>('/transactions/', newTransaction)
      setTransactions((prev) => [response.data, ...prev])
      toast({
        title: 'Erfolg',
        description: 'Transaktion wurde erfolgreich hinzugefügt.',
      })
    } catch (error) {
      console.error('Error creating transaction:', error)
      toast({
        title: 'Fehler',
        description: 'Transaktion konnte nicht gespeichert werden.',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleDeleteTransaction = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/transactions/${id}/`)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      toast({
        title: 'Erfolg',
        description: 'Transaktion wurde gelöscht.',
      })
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({
        title: 'Fehler',
        description: 'Transaktion konnte nicht gelöscht werden.',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleUpdateTransaction = useCallback(async (updated: Transaction) => {
    try {
      const response = await apiClient.put<Transaction>(`/transactions/${updated.id}/`, updated)
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? response.data : t)))
      setSelectedTransaction(response.data)
      toast({
        title: 'Erfolg',
        description: 'Transaktion wurde aktualisiert.',
      })
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        title: 'Fehler',
        description: 'Transaktion konnte nicht aktualisiert werden.',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleSelectTransaction = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDetailsOpen(true)
  }, [])

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Overview Cards */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
              <span className=" font-semibold text-primary capitalize">
                {now.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <AddTransactionModal onAddTransaction={handleAddTransaction} />
          </div>
          <OverviewCards
            balance={balance}
            income={totals.income}
            expenses={totals.expenses}
            isLoading={isLoading}
          />
        </section>

        {/* Charts and Transaction List */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Charts */}
          <div>
            <TransactionList
              transactions={sortedTransactions.slice(0, 10)}
              isLoading={isLoading}
              onSelectTransaction={handleSelectTransaction}
            />
          </div>
           {/* Right Column - Charts */}
          <div className="space-y-8">
            <ExpenseChart data={monthlyData} isLoading={isLoading} />
            <CategoryBreakdown transactions={transactions} isLoading={isLoading} />
          </div>
        </div>
      </div>
      <TransactionDetailsModal
        transaction={selectedTransaction}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdateTransaction={handleUpdateTransaction}
        onDeleteTransaction={handleDeleteTransaction}
      />
    </div>
  )
}
