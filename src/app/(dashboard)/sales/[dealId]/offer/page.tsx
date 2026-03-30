'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Deal, leadFullName } from '@/types'
import type { OfferFormData, ScopeItem, TimelineStage, PriceBreakdownItem } from '@/components/offer/OfferPDFDocument'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Sparkles, Loader2, Plus, Trash2,
  Eye, FileDown, GripVertical, Check,
} from 'lucide-react'

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SCOPE: ScopeItem[] = [
  { id: '1', text: '', included: true },
]

const DEFAULT_TIMELINE: TimelineStage[] = [
  { id: '1', week: 'Tydzień 1', name: 'Projektowanie i prototyp' },
  { id: '2', week: 'Tydzień 2', name: 'Budowa' },
  { id: '3', week: 'Tydzień 3', name: 'Testy i poprawki' },
  { id: '4', week: 'Tydzień 4', name: 'Wdrożenie i szkolenie' },
]

const DEFAULT_NEXT_STEPS = `Akceptacja oferty (odpowiedź na maila lub potwierdzenie na LinkedIn)
Wpłata zaliczki 50% na podstawie faktury proforma
Spotkanie startowe w ciągu 48h od wpłaty
Rozpoczęcie prac zgodnie z harmonogramem`

const PROJECT_TYPES = [
  'Strona internetowa',
  'Landing page',
  'Chatbot AI',
  'AI Recepcjonista',
  'System wewnętrzny',
  'Aplikacja webowa',
  'Aplikacja mobilna',
]

const PAYMENT_TERMS = [
  '50% zaliczka + 50% po wdrożeniu',
  '100% z góry (-5%)',
  '3 raty',
]

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

function buildInitialData(deal: Deal | null): OfferFormData {
  const lead = deal?.lead
  return {
    clientName: lead ? leadFullName(lead) : '',
    company: lead?.company ?? '',
    position: lead?.position ?? '',
    conversationSummary: deal?.diagnosis_notes ?? '',
    identifiedProblem: deal?.client_problem ?? '',
    businessImpact: '',
    projectType: deal?.project_type ?? '',
    solutionDescription: deal?.suggested_solution ?? '',
    scopeItems: DEFAULT_SCOPE,
    timelineStages: DEFAULT_TIMELINE,
    totalPrice: deal?.value ?? deal?.suggested_price_min ?? 0,
    priceBreakdown: [],
    discount: 0,
    discountType: 'PLN',
    paymentTerms: PAYMENT_TERMS[0],
    nextStepsText: DEFAULT_NEXT_STEPS,
    additionalNotes: '',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OfferGeneratorPage() {
  const { dealId } = useParams<{ dealId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [deal, setDeal] = useState<Deal | null>(null)
  const [loadingDeal, setLoadingDeal] = useState(true)
  const [formData, setFormData] = useState<OfferFormData>(buildInitialData(null))
  const [aiLoading, setAiLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Load deal ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .eq('id', dealId)
        .single()

      setDeal(data)
      setLoadingDeal(false)

      if (!data) return

      // Check localStorage first
      const saved = localStorage.getItem(`offer_draft_${dealId}`)
      if (saved) {
        try {
          setFormData(JSON.parse(saved))
          return
        } catch {
          // ignore parse error, fall back to DB data
        }
      }
      setFormData(buildInitialData(data))
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId])

  // ── Auto-save to localStorage ──────────────────────────────────────────────
  useEffect(() => {
    if (loadingDeal) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(`offer_draft_${dealId}`, JSON.stringify(formData))
    }, 1500)
    return () => clearTimeout(saveTimer.current)
  }, [formData, dealId, loadingDeal])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = useCallback((patch: Partial<OfferFormData>) => {
    setFormData(prev => ({ ...prev, ...patch }))
  }, [])

  // ── Scope items ────────────────────────────────────────────────────────────
  const addScope = () =>
    set({ scopeItems: [...formData.scopeItems, { id: makeId(), text: '', included: true }] })

  const updateScope = (id: string, patch: Partial<ScopeItem>) =>
    set({ scopeItems: formData.scopeItems.map(s => s.id === id ? { ...s, ...patch } : s) })

  const removeScope = (id: string) =>
    set({ scopeItems: formData.scopeItems.filter(s => s.id !== id) })

  // ── Timeline ───────────────────────────────────────────────────────────────
  const addTimeline = () =>
    set({ timelineStages: [...formData.timelineStages, { id: makeId(), week: `Tydzień ${formData.timelineStages.length + 1}`, name: '' }] })

  const updateTimeline = (id: string, patch: Partial<TimelineStage>) =>
    set({ timelineStages: formData.timelineStages.map(t => t.id === id ? { ...t, ...patch } : t) })

  const removeTimeline = (id: string) =>
    set({ timelineStages: formData.timelineStages.filter(t => t.id !== id) })

  // ── Price breakdown ────────────────────────────────────────────────────────
  const addBreakdown = () =>
    set({ priceBreakdown: [...formData.priceBreakdown, { id: makeId(), label: '', amount: 0 }] })

  const updateBreakdown = (id: string, patch: Partial<PriceBreakdownItem>) =>
    set({ priceBreakdown: formData.priceBreakdown.map(p => p.id === id ? { ...p, ...patch } : p) })

  const removeBreakdown = (id: string) =>
    set({ priceBreakdown: formData.priceBreakdown.filter(p => p.id !== id) })

  // ── Computed price ─────────────────────────────────────────────────────────
  const discountAmount = formData.discount > 0
    ? formData.discountType === '%'
      ? Math.round(formData.totalPrice * formData.discount / 100)
      : formData.discount
    : 0
  const finalPrice = formData.totalPrice - discountAmount

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    if (!formData.company.trim()) { toast.error('Uzupełnij nazwę firmy'); return false }
    if (!formData.clientName.trim()) { toast.error('Uzupełnij imię i nazwisko klienta'); return false }
    if (!formData.projectType) { toast.error('Wybierz typ projektu'); return false }
    if (!formData.scopeItems.some(s => s.text.trim() && s.included)) {
      toast.error('Dodaj przynajmniej 1 punkt zakresu'); return false
    }
    if (formData.totalPrice <= 0) { toast.error('Wpisz cenę'); return false }
    return true
  }

  // ── AI Generate ────────────────────────────────────────────────────────────
  const handleAIGenerate = async () => {
    if (!formData.conversationSummary.trim() && !deal?.diagnosis_notes?.trim()) {
      toast.error('Wypełnij pole "Podsumowanie rozmowy" lub uzupełnij diagnozę w dealu')
      return
    }
    setAiLoading(true)
    try {
      const res = await fetch('/api/offers/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis_notes: formData.conversationSummary || deal?.diagnosis_notes || '',
          client_name: formData.clientName,
          company: formData.company,
          segment: deal?.lead?.segment,
        }),
      })
      const { result, error } = await res.json()
      if (error) throw new Error(error)

      const scopeItems: ScopeItem[] = (result.scope_items ?? []).map((text: string) => ({
        id: makeId(), text, included: true,
      }))

      set({
        conversationSummary: result.conversation_summary ?? formData.conversationSummary,
        identifiedProblem: result.identified_problem ?? formData.identifiedProblem,
        businessImpact: result.roi_note ?? formData.businessImpact,
        solutionDescription: result.solution_description ?? formData.solutionDescription,
        scopeItems: scopeItems.length > 0 ? scopeItems : formData.scopeItems,
      })
      toast.success('AI wypełnił treści oferty')
    } catch {
      toast.error('Błąd generowania AI')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Generate PDF (client-side) ─────────────────────────────────────────────
  const generatePDF = async (mode: 'preview' | 'save') => {
    if (mode === 'save' && !validate()) return
    setGenerating(true)

    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { OfferPDFDocument } = await import('@/components/offer/OfferPDFDocument')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(<OfferPDFDocument data={formData} /> as any).toBlob()

      if (mode === 'preview') {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
        return
      }

      // Save: upload to Supabase Storage → update deal
      const fileName = `${dealId}/${Date.now()}.pdf`

      const { error: uploadErr } = await supabase.storage
        .from('offers')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true })

      if (uploadErr) {
        // Bucket may not exist — fall back to browser download
        console.warn('[offer] storage upload failed:', uploadErr.message)
        downloadBlob(blob, formData.company)
        toast.success('PDF pobrany (brak bucketu "offers" w Supabase Storage)')
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('offers').getPublicUrl(fileName)
      const now = new Date().toISOString()

      await supabase
        .from('deals')
        .update({ offer_pdf_url: publicUrl, offer_sent_at: deal?.offer_sent_at ?? now })
        .eq('id', dealId)

      // Clear draft
      localStorage.removeItem(`offer_draft_${dealId}`)

      toast.success('Oferta wygenerowana i zapisana!')
      router.push(`/sales/${dealId}`)
    } catch (err) {
      console.error('[offer-generate]', err)
      toast.error('Błąd generowania PDF')
    } finally {
      setGenerating(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loadingDeal) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  const inputCls = 'w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors'
  const textareaCls = `${inputCls} resize-none`
  const labelCls = 'block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5'

  return (
    <div className="max-w-3xl space-y-5 pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={`/sales/${dealId}`}>
            <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft size={16} className="text-white/50" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Generator oferty</h1>
            {deal && <p className="text-xs text-white/40 mt-0.5">{deal.title}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => generatePDF('preview')}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-white/60 text-sm hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <Eye size={14} />
            Podgląd PDF
          </button>
          <button
            onClick={() => generatePDF('save')}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generating
              ? <><Loader2 size={14} className="animate-spin" />Generuję…</>
              : <><FileDown size={14} />Generuj i zapisz PDF</>}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SEKCJA 1: Dane klienta
      ══════════════════════════════════════════ */}
      <SectionCard title="Dane klienta">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Imię i nazwisko</label>
            <input
              className={inputCls}
              placeholder="Jan Kowalski"
              value={formData.clientName}
              onChange={e => set({ clientName: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Firma</label>
            <input
              className={inputCls}
              placeholder="Nazwa firmy"
              value={formData.company}
              onChange={e => set({ company: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Stanowisko</label>
            <input
              className={inputCls}
              placeholder="Właściciel / CEO / Dyrektor"
              value={formData.position}
              onChange={e => set({ position: e.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════
          SEKCJA 2: Problem klienta
      ══════════════════════════════════════════ */}
      <SectionCard
        title="Problem klienta"
        action={
          <button
            onClick={handleAIGenerate}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {aiLoading
              ? <><Loader2 size={11} className="animate-spin" />Generuję…</>
              : <><Sparkles size={11} />Generuj z AI</>}
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Podsumowanie rozmowy</label>
            <textarea
              className={textareaCls}
              rows={4}
              placeholder="Na naszym spotkaniu opowiedziałeś/aś o…"
              value={formData.conversationSummary}
              onChange={e => set({ conversationSummary: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Zidentyfikowany problem</label>
            <textarea
              className={textareaCls}
              rows={3}
              placeholder="Precyzyjnie opisz główny problem klienta…"
              value={formData.identifiedProblem}
              onChange={e => set({ identifiedProblem: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Wpływ problemu na biznes</label>
            <textarea
              className={textareaCls}
              rows={3}
              placeholder="Klient traci X zapytań tygodniowo przez brak formularza. Przy średniej wartości klienta 500 PLN, to 20 000 PLN rocznie…"
              value={formData.businessImpact}
              onChange={e => set({ businessImpact: e.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════
          SEKCJA 3: Rozwiązanie
      ══════════════════════════════════════════ */}
      <SectionCard title="Rozwiązanie">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Typ projektu</label>
            <select
              className={`${inputCls} cursor-pointer`}
              value={formData.projectType}
              onChange={e => set({ projectType: e.target.value })}
            >
              <option value="">Wybierz typ…</option>
              {PROJECT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Opis rozwiązania</label>
            <textarea
              className={textareaCls}
              rows={4}
              placeholder="Zbudujemy responsywną stronę internetową z…"
              value={formData.solutionDescription}
              onChange={e => set({ solutionDescription: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Zakres prac</label>
            <div className="space-y-2">
              {formData.scopeItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => updateScope(item.id, { included: !item.included })}
                    className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                      item.included
                        ? 'bg-primary border-primary'
                        : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {item.included && <Check size={11} className="text-white" />}
                  </button>
                  <input
                    className="flex-1 bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="np. Responsywna strona główna + 4 podstrony"
                    value={item.text}
                    onChange={e => updateScope(item.id, { text: e.target.value })}
                  />
                  <button
                    onClick={() => removeScope(item.id)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addScope}
              className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus size={13} />Dodaj punkt zakresu
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════
          SEKCJA 4: Harmonogram
      ══════════════════════════════════════════ */}
      <SectionCard title="Harmonogram">
        <div className="space-y-2">
          {formData.timelineStages.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-2">
              <GripVertical size={14} className="text-white/20 flex-shrink-0" />
              <input
                className="w-28 flex-shrink-0 bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={`Tydzień ${i + 1}`}
                value={stage.week}
                onChange={e => updateTimeline(stage.id, { week: e.target.value })}
              />
              <input
                className="flex-1 bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Nazwa etapu"
                value={stage.name}
                onChange={e => updateTimeline(stage.id, { name: e.target.value })}
              />
              <button
                onClick={() => removeTimeline(stage.id)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addTimeline}
          className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={13} />Dodaj etap
        </button>
      </SectionCard>

      {/* ══════════════════════════════════════════
          SEKCJA 5: Wycena
      ══════════════════════════════════════════ */}
      <SectionCard title="Wycena">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Cena całkowita (PLN)</label>
              <input
                type="number"
                className={inputCls}
                placeholder="0"
                value={formData.totalPrice || ''}
                onChange={e => set({ totalPrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>Warunki płatności</label>
              <select
                className={`${inputCls} cursor-pointer`}
                value={formData.paymentTerms}
                onChange={e => set({ paymentTerms: e.target.value })}
              >
                {PAYMENT_TERMS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rozbicie cenowe */}
          {formData.priceBreakdown.length > 0 && (
            <div>
              <label className={labelCls}>Rozbicie cenowe</label>
              <div className="space-y-2">
                {formData.priceBreakdown.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      className="flex-1 bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="np. Design i prototyp"
                      value={item.label}
                      onChange={e => updateBreakdown(item.id, { label: e.target.value })}
                    />
                    <input
                      type="number"
                      className="w-32 bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="0"
                      value={item.amount || ''}
                      onChange={e => updateBreakdown(item.id, { amount: Number(e.target.value) })}
                    />
                    <button
                      onClick={() => removeBreakdown(item.id)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={addBreakdown}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-primary transition-colors"
          >
            <Plus size={13} />Dodaj rozbicie cenowe (opcjonalne)
          </button>

          {/* Rabat */}
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="col-span-2">
              <label className={labelCls}>Rabat (opcjonalny)</label>
              <input
                type="number"
                className={inputCls}
                placeholder="0"
                value={formData.discount || ''}
                onChange={e => set({ discount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>Typ</label>
              <select
                className={`${inputCls} cursor-pointer`}
                value={formData.discountType}
                onChange={e => set({ discountType: e.target.value as 'PLN' | '%' })}
              >
                <option value="PLN">PLN</option>
                <option value="%">%</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#1A1A2E] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider">Cena finalna</p>
              {discountAmount > 0 && (
                <p className="text-sm text-white/30 line-through">
                  {formData.totalPrice.toLocaleString('pl-PL')} PLN
                </p>
              )}
            </div>
            <p className="text-2xl font-black text-primary tabular-nums">
              {finalPrice.toLocaleString('pl-PL')} PLN
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ══════════════════════════════════════════
          SEKCJA 6: Następne kroki
      ══════════════════════════════════════════ */}
      <SectionCard title="Następne kroki">
        <textarea
          className={textareaCls}
          rows={6}
          value={formData.nextStepsText}
          onChange={e => set({ nextStepsText: e.target.value })}
        />
        <p className="text-[11px] text-white/25 mt-1.5">
          Każda linia = osobny krok w PDF. Numery i myślniki są automatycznie usuwane.
        </p>
      </SectionCard>

      {/* ══════════════════════════════════════════
          SEKCJA 7: Notatki dodatkowe
      ══════════════════════════════════════════ */}
      <SectionCard title="Notatki dodatkowe (opcjonalne)">
        <textarea
          className={textareaCls}
          rows={3}
          placeholder="Dodatkowe informacje dla klienta, warunki specjalne, uwagi…"
          value={formData.additionalNotes}
          onChange={e => set({ additionalNotes: e.target.value })}
        />
      </SectionCard>

      {/* ── Bottom action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F0F1A]/90 border-t border-white/10 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-4 z-30">
        <p className="text-[11px] text-white/25">Szkic zapisywany automatycznie</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generatePDF('preview')}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-white/60 text-sm hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <Eye size={14} />
            Podgląd PDF
          </button>
          <button
            onClick={() => generatePDF('save')}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generating
              ? <><Loader2 size={14} className="animate-spin" />Generuję…</>
              : <><FileDown size={14} />Generuj i zapisz PDF</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SectionCard helper ───────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
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

// ─── Download fallback ────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, company: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `oferta-${company.replace(/\s+/g, '-').toLowerCase()}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
