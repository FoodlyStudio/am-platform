'use client'

import { useState, useCallback } from 'react'
import { ContentItem } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export function useContent() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('content_calendar')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setItems(data ?? [])
    } catch (err) {
      toast.error('Failed to load content')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (item: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>) => {
    const supabase = createClient()
    const { data, error } = await supabase.from('content_calendar').insert(item).select().single()
    if (error) { toast.error('Failed to create content'); return null }
    setItems((prev) => [data, ...prev])
    toast.success('Content created')
    return data as ContentItem
  }, [])

  const update = useCallback(async (id: string, updates: Partial<ContentItem>) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('content_calendar')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) { toast.error('Failed to update content'); return }
    setItems((prev) => prev.map((i) => (i.id === id ? (data as ContentItem) : i)))
    toast.success('Content updated')
  }, [])

  const remove = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('content_calendar').delete().eq('id', id)
    if (error) { toast.error('Failed to delete content'); return }
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  return { items, loading, fetch, create, update, remove }
}
