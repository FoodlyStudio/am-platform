'use client'

import { useState, useCallback } from 'react'
import { Lead } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setLeads(data ?? [])
    } catch (err) {
      toast.error('Failed to load leads')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
    const supabase = createClient()
    const { data, error } = await supabase.from('leads').insert(lead).select().single()
    if (error) { toast.error('Failed to create lead'); return null }
    setLeads((prev) => [data, ...prev])
    toast.success('Lead created')
    return data as Lead
  }, [])

  const update = useCallback(async (id: string, updates: Partial<Lead>) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) { toast.error('Failed to update lead'); return }
    setLeads((prev) => prev.map((l) => (l.id === id ? (data as Lead) : l)))
    toast.success('Lead updated')
  }, [])

  const remove = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) { toast.error('Failed to delete lead'); return }
    setLeads((prev) => prev.filter((l) => l.id !== id))
    toast.success('Lead deleted')
  }, [])

  return { leads, loading, fetch, create, update, remove }
}
