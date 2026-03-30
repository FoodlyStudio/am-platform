'use client'

import { useState, useCallback } from 'react'
import { ContentTemplate } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

function computeScore(likes = 0, comments = 0, reach = 0): number {
  if (reach <= 0) return 0
  // engagement rate * 1000, capped at 100
  const engagement = (likes * 1 + comments * 3) / reach
  return Math.min(100, Math.round(engagement * 1000))
}

export function useTemplates() {
  const [templates, setTemplates] = useState<ContentTemplate[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('content_templates')
        .select('*')
        .order('performance_score', { ascending: false, nullsFirst: false })
      if (error) throw error
      setTemplates(data ?? [])
    } catch (err) {
      toast.error('Błąd ładowania szablonów')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(
    async (
      template: Omit<ContentTemplate, 'id' | 'created_at'>,
    ): Promise<ContentTemplate | null> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('content_templates')
        .insert({ ...template, times_used: 0, is_active: true })
        .select()
        .single()
      if (error) {
        toast.error('Błąd dodawania szablonu')
        return null
      }
      setTemplates((prev) => [data as ContentTemplate, ...prev])
      toast.success('Szablon dodany')
      return data as ContentTemplate
    },
    [],
  )

  const createMany = useCallback(
    async (
      templates: Omit<ContentTemplate, 'id' | 'created_at'>[],
    ): Promise<number> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('content_templates')
        .insert(templates.map((t) => ({ ...t, times_used: 0, is_active: true })))
        .select()
      if (error) {
        toast.error('Błąd zapisywania szablonów')
        return 0
      }
      setTemplates((prev) => [...(data as ContentTemplate[]), ...prev])
      toast.success(`Dodano ${data?.length ?? 0} szablonów`)
      return data?.length ?? 0
    },
    [],
  )

  const update = useCallback(
    async (id: string, updates: Partial<ContentTemplate>) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('content_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) {
        toast.error('Błąd aktualizacji szablonu')
        return
      }
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? (data as ContentTemplate) : t)),
      )
    },
    [],
  )

  const updateMetrics = useCallback(
    async (id: string, likes: number, comments: number, reach: number) => {
      const score = computeScore(likes, comments, reach)
      await update(id, {
        perf_likes: likes,
        perf_comments: comments,
        perf_reach: reach,
        performance_score: score,
      })
      toast.success(`Performance score: ${score}/100`)
    },
    [update],
  )

  const incrementUsed = useCallback(
    async (id: string, current: number) => {
      await update(id, { times_used: (current ?? 0) + 1 })
    },
    [update],
  )

  const remove = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('content_templates').delete().eq('id', id)
    if (error) {
      toast.error('Błąd usuwania szablonu')
      return
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return {
    templates,
    loading,
    fetch,
    create,
    createMany,
    update,
    updateMetrics,
    incrementUsed,
    remove,
  }
}
