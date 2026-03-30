'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Deal, leadFullName } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { addDays, format } from 'date-fns'
import {
  ArrowLeft, Plus, Trash2, Sparkles, Loader2,
  Copy, Check, ExternalLink, GripVertical,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingVariant {
  id: string
  name: string
  price: number
  features: string[]
  is_recommended: boolean
  ai_match_reason: string
}

interface TimelineItem {
  id: string
  week: string
  name: string
}

interface ScopeItem {
  id: string
  text: string
  included: boolean
}

interface FormData {
  company_name: string
  project_type: string
  solution_description: string
  daily_loss: number
  monthly_loss: number
  yearly_loss: number
  roi_months: number
  pricing_variants: PricingVariant[]
  timeline_items: TimelineItem[]
  scope_items: ScopeItem[]
  start_date: string
  payment_terms: string
  expires_days: number
}

function makeId() { return Math.random().toString(36).slice(2, 9) }

function nextWorkdaysDate(days: number): string {
  let d = new Date(); let added = 0
  while (added < days) {
    d = addDays(d, 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return format(d, 'yyyy-MM-dd')
}

const DEFAULT_TIMELINE: TimelineItem[] = [
  { id: '1', week: 'Tydzień 1', name: 'Projektowanie i prototyp' },
  { id: '2', week: 'Tydzień 2', name: 'Budowa' },
  { id: '3', week: 'Tydzień 3', name: 'Testy i poprawki' },
  { id: '4', week: 'Tydzień 4', name: 'Wdrożenie i szkolenie' },
]

const DEFAULT_VARIANTS: PricingVariant[] = [
  { id: '1', name: 'Basic', price: 5000, features: [''], is_recommended: false, ai_match_reason: '' },
  { id: '2', name: 'Standard', price: 8000, features: [''], is_recommended: true, ai_match_reason: '' },
  { id: '3', name: 'Pro', price: 12000, features: [''], is_recommended: false, ai_match_reason: '' },
]

function buildInitial(deal: Deal | null): FormData {
  return {
    company_name: deal?.lead?.company ?? '',
    project_type: deal?.project_type ?? '',
    solution_description: deal?.suggested_solution ?? '',
    daily_loss: 0,
    monthly_loss: 0,
    yearly_loss: 0,
    roi_months: 6,
    pricing_variants: DEFAULT_VARIANTS,
    timeline_items: DEFAULT_TIMELINE,
    scope_items: [{ id: '1', text: '', included: true }],
    start_date: nextWorkdaysDate(5),
    payment_terms: '50% zaliczka + 50% po wdrożeniu',
    expires_days: 14,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InteractiveOfferPage() {
  const { dealId } = useParams<{ dealId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormData>(buildInitial(null))
  const [publishing, setPublishing] = useState(false)
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [aiLossLoading, setAiLossLoading] = useState(false)
  const [aiVariantsLoading, setAiVariantsLoading] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .eq('id', dealId)
        .single()
      setDeal(data)
      setLoading(false)
      if (data) {
        const saved = localStorage.getItem(`iof_draft_${dealId}`)
        if (saved) { try { setForm(JSON.parse(saved)); return } catch { /**/ } }
        setForm(buildInitial(data))
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId])

  // Auto-save draft
  useEffect(() => {
    if (loading) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(`iof_draft_${dealId}`, JSON.stringify(form))
    }, 1200)
    return () => clearTimeout(saveTimer.current)
  }, [form, dealId, loading])

  const set = useCallback((patch: Partial<FormData>) => setForm(p => ({ ...p, ...patch })), [])

  // ── AI: Loss Calculator ────────────────────────────────────────────────────
  const calcLossAI = async () => {
    setAiLossLoading(true)
    try {
      const res = await fetch('/api/offers/ai-loss-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis_notes: deal?.diagnosis_notes ?? deal?.client_problem ?? '',
          segment: deal?.lead?.segment,
          project_type: form.project_type,
        }),
      })
      const { result, error } = await res.json()
      if (error) throw new Error(error)
      set({
        daily_loss: result.daily_loss ?? 0,
        monthly_loss: result.monthly_loss ?? 0,
        yearly_loss: result.yearly_loss ?? 0,
        roi_months: result.roi_months ?? 6,
      })
      toast.success('AI obliczył straty')
    } catch { toast.error('Błąd kalkulacji AI') }
    finally { setAiLossLoading(false) }
  }

  // ── AI: Variants ───────────────────────────────────────────────────────────
  const genVariantsAI = async () => {
    setAiVariantsLoading(true)
    try {
      const res = await fetch('/api/offers/ai-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis_notes: deal?.diagnosis_notes ?? deal?.client_problem ?? '',
          project_type: form.project_type,
          segment: deal?.lead?.segment,
          suggested_price_min: deal?.suggested_price_min,
          suggested_price_max: deal?.suggested_price_max ?? deal?.value,
        }),
      })
      const { result, error } = await res.json()
      if (error) throw new Error(error)
      const variants: PricingVariant[] = (result.variants ?? []).map((v: Omit<PricingVariant, 'id'>) => ({
        ...v, id: makeId(),
      }))
      if (variants.length > 0) {
        set({ pricing_variants: variants })
        toast.success('AI wygenerował warianty cenowe')
      }
    } catch { toast.error('Błąd generowania wariantów') }
    finally { setAiVariantsLoading(false) }
  }

  // ── Variant helpers ────────────────────────────────────────────────────────
  const updateVariant = (id: string, patch: Partial<PricingVariant>) =>
    set({ pricing_variants: form.pricing_variants.map(v => v.id === id ? { ...v, ...patch } : v) })

  const updateVariantFeature = (variantId: string, featureIdx: number, value: string) =>
    set({
      pricing_variants: form.pricing_variants.map(v => {
        if (v.id !== variantId) return v
        const features = [...v.features]
        features[featureIdx] = value
        return { ...v, features }
      }),
    })

  const addVariantFeature = (variantId: string) =>
    set({
      pricing_variants: form.pricing_variants.map(v =>
        v.id === variantId ? { ...v, features: [...v.features, ''] } : v
      ),
    })

  const removeVariantFeature = (variantId: string, idx: number) =>
    set({
      pricing_variants: form.pricing_variants.map(v =>
        v.id === variantId ? { ...v, features: v.features.filter((_, i) => i !== idx) } : v
      ),
    })

  // ── Scope helpers ──────────────────────────────────────────────────────────
  const updateScope = (id: string, patch: { text?: string; included?: boolean }) =>
    set({ scope_items: form.scope_items.map(s => s.id === id ? { ...s, ...patch } : s) })

  // ── Timeline helpers ───────────────────────────────────────────────────────
  const updateTimeline = (id: string, patch: { week?: string; name?: string }) =>
    set({ timeline_items: form.timeline_items.map(t => t.id === id ? { ...t, ...patch } : t) })

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!form.company_name.trim()) { toast.error('Uzupełnij nazwę firmy'); return }
    setPublishing(true)
    try {
      // Generate 8-char nanoid-like slug
      const slug = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map(b => b.toString(36)).join('').slice(0, 8)

      const expiresAt = form.expires_days > 0
        ? format(addDays(new Date(), form.expires_days), "yyyy-MM-dd'T'HH:mm:ssxxx")
        : null

      const { error } = await supabase.from('offer_pages').insert({
        deal_id: dealId,
        public_slug: slug,
        company_name: form.company_name,
        project_type: form.project_type || null,
        solution_description: form.solution_description || null,
        daily_loss_amount: form.daily_loss || null,
        monthly_loss_amount: form.monthly_loss || null,
        yearly_loss_amount: form.yearly_loss || null,
        roi_months: form.roi_months || null,
        pricing_variants: form.pricing_variants,
        timeline_items: form.timeline_items,
        scope_items: form.scope_items,
        start_date: form.start_date || null,
        payment_terms: form.payment_terms || null,
        expires_at: expiresAt,
        is_active: true,
        view_count: 0,
        sections_viewed: {},
      })

      if (error) throw error

      setPublishedSlug(slug)
      localStorage.removeItem(`iof_draft_${dealId}`)
      toast.success('Interaktywna oferta opublikowana!')
    } catch (err) {
      console.error(err)
      toast.error('Błąd publikowania oferty')
    } finally {
      setPublishing(false)
    }
  }

  const offerUrl = publishedSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/offer/${publishedSlug}`
    : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(offerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputCls = 'w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40'
  const labelCls = 'block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-5 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={`/sales/${dealId}`}>
            <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft size={16} className="text-white/50" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Interaktywna oferta</h1>
            {deal && <p className="text-xs text-white/40 mt-0.5">{deal.title}</p>}
          </div>
        </div>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {publishing ? <><Loader2 size={14} className="animate-spin" />Publikuję…</> : 'Publikuj ofertę'}
        </button>
      </div>

      {/* Published link */}
      {publishedSlug && (
        <div className="bg-secondary/10 border border-secondary/25 rounded-2xl p-4 flex items-center gap-3">
          <Check size={16} className="text-secondary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-secondary">Oferta opublikowana!</p>
            <p className="text-xs text-white/50 truncate mt-0.5">{offerUrl}</p>
          </div>
          <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/30 text-secondary text-xs hover:bg-secondary/20 transition-colors flex-shrink-0">
            {copied ? <><Check size={12} />Skopiowano</> : <><Copy size={12} />Kopiuj link</>}
          </button>
          <a href={offerUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-white/40 hover:text-white transition-colors flex-shrink-0">
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* Dane podstawowe */}
      <Card title="Dane podstawowe">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nazwa firmy klienta</label>
            <input className={inputCls} value={form.company_name} onChange={e => set({ company_name: e.target.value })} placeholder="Gabinet XYZ" />
          </div>
          <div>
            <label className={labelCls}>Typ projektu</label>
            <input className={inputCls} value={form.project_type} onChange={e => set({ project_type: e.target.value })} placeholder="Strona internetowa" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Opis rozwiązania</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.solution_description} onChange={e => set({ solution_description: e.target.value })} placeholder="Zbudujemy…" />
          </div>
          <div>
            <label className={labelCls}>Data startu projektu</label>
            <input type="date" className={inputCls} value={form.start_date} onChange={e => set({ start_date: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Ważność oferty (dni, 0 = bez limitu)</label>
            <input type="number" className={inputCls} value={form.expires_days} onChange={e => set({ expires_days: Number(e.target.value) })} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Warunki płatności</label>
            <input className={inputCls} value={form.payment_terms} onChange={e => set({ payment_terms: e.target.value })} />
          </div>
        </div>
      </Card>

      {/* Kalkulator strat */}
      <Card
        title="Kalkulator strat (FOMO)"
        action={
          <button onClick={calcLossAI} disabled={aiLossLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50">
            {aiLossLoading ? <><Loader2 size={11} className="animate-spin" />Obliczam…</> : <><Sparkles size={11} />Oblicz z AI</>}
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Strata dzienna (PLN)</label>
            <input type="number" className={inputCls} value={form.daily_loss || ''} onChange={e => set({ daily_loss: Number(e.target.value) })} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Strata miesięczna (PLN)</label>
            <input type="number" className={inputCls} value={form.monthly_loss || ''} onChange={e => set({ monthly_loss: Number(e.target.value) })} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Strata roczna (PLN)</label>
            <input type="number" className={inputCls} value={form.yearly_loss || ''} onChange={e => set({ yearly_loss: Number(e.target.value) })} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Zwrot inwestycji (miesiące)</label>
            <input type="number" className={inputCls} value={form.roi_months || ''} onChange={e => set({ roi_months: Number(e.target.value) })} placeholder="6" />
          </div>
        </div>
      </Card>

      {/* Warianty cenowe */}
      <Card
        title="Warianty cenowe"
        action={
          <button onClick={genVariantsAI} disabled={aiVariantsLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50">
            {aiVariantsLoading ? <><Loader2 size={11} className="animate-spin" />Generuję…</> : <><Sparkles size={11} />Generuj z AI</>}
          </button>
        }
      >
        <div className="space-y-4">
          {form.pricing_variants.map((variant) => (
            <div key={variant.id} className="bg-[#1A1A2E] rounded-xl p-4 border border-white/5">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={labelCls}>Nazwa</label>
                  <input className={inputCls} value={variant.name} onChange={e => updateVariant(variant.id, { name: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Cena (PLN)</label>
                  <input type="number" className={inputCls} value={variant.price || ''} onChange={e => updateVariant(variant.id, { price: Number(e.target.value) })} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      onClick={() => updateVariant(variant.id, { is_recommended: !variant.is_recommended })}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${variant.is_recommended ? 'bg-primary border-primary' : 'border-white/20'}`}
                    >
                      {variant.is_recommended && <Check size={11} className="text-white" />}
                    </button>
                    <span className="text-xs text-white/50">Rekomendowany</span>
                  </label>
                </div>
              </div>
              {variant.is_recommended && (
                <div className="mb-3">
                  <label className={labelCls}>Powód rekomendacji</label>
                  <input className={inputCls} value={variant.ai_match_reason} onChange={e => updateVariant(variant.id, { ai_match_reason: e.target.value })} placeholder="Najlepiej dopasowany, ponieważ…" />
                </div>
              )}
              <div>
                <label className={labelCls}>Features</label>
                <div className="space-y-2">
                  {variant.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className="flex-1 bg-[#16213E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40" value={f} onChange={e => updateVariantFeature(variant.id, i, e.target.value)} placeholder="Feature…" />
                      <button onClick={() => removeVariantFeature(variant.id, i)} className="p-1.5 text-white/25 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => addVariantFeature(variant.id)} className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Plus size={12} />Dodaj feature
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Zakres prac */}
      <Card title="Zakres prac">
        <div className="space-y-2">
          {form.scope_items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <button
                onClick={() => updateScope(item.id, { included: !item.included })}
                className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${item.included ? 'bg-primary border-primary' : 'border-white/20'}`}
              >
                {item.included && <Check size={11} className="text-white" />}
              </button>
              <input
                className="flex-1 bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Punkt zakresu prac…"
                value={item.text}
                onChange={e => updateScope(item.id, { text: e.target.value })}
              />
              <button onClick={() => set({ scope_items: form.scope_items.filter(s => s.id !== item.id) })} className="p-1.5 text-white/25 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => set({ scope_items: [...form.scope_items, { id: makeId(), text: '', included: true }] })} className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
          <Plus size={13} />Dodaj punkt
        </button>
      </Card>

      {/* Harmonogram */}
      <Card title="Harmonogram">
        <div className="space-y-2">
          {form.timeline_items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <GripVertical size={14} className="text-white/20 flex-shrink-0" />
              <input
                className="w-28 flex-shrink-0 bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={item.week}
                onChange={e => updateTimeline(item.id, { week: e.target.value })}
              />
              <input
                className="flex-1 bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={item.name}
                onChange={e => updateTimeline(item.id, { name: e.target.value })}
                placeholder="Nazwa etapu"
              />
              <button onClick={() => set({ timeline_items: form.timeline_items.filter(t => t.id !== item.id) })} className="p-1.5 text-white/25 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => set({ timeline_items: [...form.timeline_items, { id: makeId(), week: `Tydzień ${form.timeline_items.length + 1}`, name: '' }] })} className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
          <Plus size={13} />Dodaj etap
        </button>
      </Card>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F0F1A]/90 border-t border-white/10 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-4 z-30">
        <p className="text-[11px] text-white/25">Szkic zapisywany automatycznie</p>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {publishing ? <><Loader2 size={14} className="animate-spin" />Publikuję…</> : 'Publikuj ofertę'}
        </button>
      </div>
    </div>
  )
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-[#16213E] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}
