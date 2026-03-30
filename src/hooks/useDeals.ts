'use client'

import { useState, useCallback } from 'react'
import { Deal, PipelineStage } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setDeals(data ?? [])
    } catch (err) {
      toast.error('Failed to load deals')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>) => {
    const supabase = createClient()
    const { data, error } = await supabase.from('deals').insert(deal).select('*, lead:leads(*)').single()
    if (error) { toast.error('Failed to create deal'); return null }
    setDeals((prev) => [data, ...prev])
    toast.success('Deal created')
    return data as Deal
  }, [])

  const moveStage = useCallback(async (
    id: string,
    stage: PipelineStage,
    extra?: Record<string, unknown>,
  ) => {
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = {
      stage,
      stage_changed_at: now,
      updated_at: now,
      ...extra,
    }
    // Optimistic update
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)))
    const supabase = createClient()
    const { error } = await supabase.from('deals').update(updates).eq('id', id)
    if (error) {
      toast.error('Failed to move deal')
      console.error(error)
    }
  }, [])

  const update = useCallback(async (id: string, updates: Partial<Deal>) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('deals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, lead:leads(*)')
      .single()
    if (error) { toast.error('Failed to update deal'); return }
    setDeals((prev) => prev.map((d) => (d.id === id ? (data as Deal) : d)))
    toast.success('Deal updated')
  }, [])

  const remove = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('deals').delete().eq('id', id)
    if (error) { toast.error('Failed to delete deal'); return }
    setDeals((prev) => prev.filter((d) => d.id !== id))
    toast.success('Deal deleted')
  }, [])

  return { deals, loading, fetch, create, moveStage, update, remove }
}
