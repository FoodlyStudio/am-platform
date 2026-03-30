'use client'

import { useState, useCallback, useMemo } from 'react'
import { Income, Expense, PLSummary } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { calcMargin } from '@/lib/utils'
import toast from 'react-hot-toast'

export function useFinance() {
  const [income, setIncome] = useState<Income[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const [{ data: incomeData, error: incomeErr }, { data: expenseData, error: expenseErr }] =
        await Promise.all([
          supabase.from('income').select('*').order('invoice_date', { ascending: false }),
          supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        ])
      if (incomeErr) throw incomeErr
      if (expenseErr) throw expenseErr
      setIncome(incomeData ?? [])
      setExpenses(expenseData ?? [])
    } catch (err) {
      toast.error('Błąd ładowania danych finansowych')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Income CRUD ────────────────────────────────────────────────────────────

  const createIncome = useCallback(
    async (data: Omit<Income, 'id' | 'created_at' | 'updated_at'>): Promise<Income | null> => {
      const supabase = createClient()
      const { data: row, error } = await supabase
        .from('income')
        .insert({ ...data, paid_amount: data.paid_amount ?? 0 })
        .select()
        .single()
      if (error) { toast.error('Błąd dodawania przychodu'); return null }
      setIncome((prev) => [row as Income, ...prev])
      toast.success('Przychód dodany')
      return row as Income
    },
    [],
  )

  const updateIncome = useCallback(
    async (id: string, updates: Partial<Income>): Promise<void> => {
      const supabase = createClient()
      const { data: row, error } = await supabase
        .from('income')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) { toast.error('Błąd aktualizacji'); return }
      setIncome((prev) => prev.map((i) => (i.id === id ? (row as Income) : i)))
      toast.success('Zaktualizowano')
    },
    [],
  )

  const deleteIncome = useCallback(async (id: string): Promise<void> => {
    const supabase = createClient()
    const { error } = await supabase.from('income').delete().eq('id', id)
    if (error) { toast.error('Błąd usuwania'); return }
    setIncome((prev) => prev.filter((i) => i.id !== id))
    toast.success('Usunięto')
  }, [])

  // ─── Expense CRUD ───────────────────────────────────────────────────────────

  const createExpense = useCallback(
    async (data: Omit<Expense, 'id' | 'created_at'>): Promise<Expense | null> => {
      const supabase = createClient()
      const { data: row, error } = await supabase
        .from('expenses')
        .insert(data)
        .select()
        .single()
      if (error) { toast.error('Błąd dodawania wydatku'); return null }
      setExpenses((prev) => [row as Expense, ...prev])
      toast.success('Wydatek dodany')
      return row as Expense
    },
    [],
  )

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Expense>): Promise<void> => {
      const supabase = createClient()
      const { data: row, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) { toast.error('Błąd aktualizacji'); return }
      setExpenses((prev) => prev.map((e) => (e.id === id ? (row as Expense) : e)))
      toast.success('Zaktualizowano')
    },
    [],
  )

  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    const supabase = createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) { toast.error('Błąd usuwania'); return }
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    toast.success('Usunięto')
  }, [])

  // ─── Summary ─────────────────────────────────────────────────────────────────

  const summary = useMemo<PLSummary>(() => {
    const revenue = income.reduce((s, t) => s + t.paid_amount, 0)
    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0)
    const profit = revenue - totalExpenses
    return {
      revenue,
      expenses: totalExpenses,
      profit,
      margin: calcMargin(revenue, totalExpenses),
      period: 'current',
    }
  }, [income, expenses])

  return { income, expenses, loading, fetch, summary, createIncome, updateIncome, deleteIncome, createExpense, updateExpense, deleteExpense }
}
