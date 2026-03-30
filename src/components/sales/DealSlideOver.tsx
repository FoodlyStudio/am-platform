'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Deal, OutreachMessage, leadFullName } from '@/types'
import { PIPELINE_STAGES, AI_SCORE_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { differenceInCalendarDays } from 'date-fns'
import Link from 'next/link'
import {
  X, Copy, ExternalLink, Mail, MessageSquare, Clock,
  Sparkles, Loader2, ChevronDown, ChevronRight, FileText, Download, Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { MatchOfferResult } from '@/components/offer/OfferDocument'
import toast from 'react-hot-toast'

const OfferPDFButton = dynamic(
  () => import('@/components/offer/OfferPDFButton').then((m) => m.OfferPDFButton),
  { ssr: false },
)

// ─── Local AI types ───────────────────────────────────────────────────────────

interface PreCallBriefResult {
  company_overview: string
  buying_signals: string[]
  suggested_questions: string[]
  potential_solutions: string[]
  what_to_avoid: string[]
  opening_hook: string
}

interface ObjectionResult {
  objection_type: string
  responses: Array<{ approach: string; text: string }>
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Szczegóły', 'Wiadomości', 'Rozmowa', 'Oferta', 'Historia'] as const
export type SlideOverTab = typeof TABS[number]

interface DealSlideOverProps {
  deal: Deal
  initialTab?: SlideOverTab
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Deal>) => Promise<void>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DealSlideOver({
  deal,
  initialTab = 'Szczegóły',
  onClose,
  onUpdate,
}: DealSlideOverProps) {
  const [activeTab, setActiveTab] = useState<SlideOverTab>(initialTab)

  // Editable notes
  const [notes, setNotes]               = useState(deal.notes ?? '')
  const [diagnosisNotes, setDiagnosisNotes] = useState(deal.diagnosis_notes ?? '')
  const [clientProblem, setClientProblem]   = useState(deal.client_problem ?? '')
  const [savingNotes, setSavingNotes]   = useState(false)

  // Outreach messages
  const [messages, setMessages] = useState<OutreachMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  // AI: pre-call brief
  const [brief, setBrief]             = useState<PreCallBriefResult | null>(null)
  const [loadingBrief, setLoadingBrief] = useState(false)

  // AI: match offer
  const [matchResult, setMatchResult]   = useState<MatchOfferResult | null>(null)
  const [loadingMatch, setLoadingMatch] = useState(false)

  // AI: objection handler
  const [objection, setObjection]       = useState('')
  const [objResult, setObjResult]       = useState<ObjectionResult | null>(null)
  const [loadingObj, setLoadingObj]     = useState(false)

  const stage = PIPELINE_STAGES.find((s) => s.value === deal.stage)
  const daysInStage = differenceInCalendarDays(
    new Date(),
    new Date(deal.stage_changed_at ?? deal.created_at),
  )

  // Sync when deal/initialTab changes
  useEffect(() => {
    setNotes(deal.notes ?? '')
    setDiagnosisNotes(deal.diagnosis_notes ?? '')
    setClientProblem(deal.client_problem ?? '')
  }, [deal])

  useEffect(() => { setActiveTab(initialTab) }, [initialTab])

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  // Load messages on tab change
  useEffect(() => {
    if (activeTab !== 'Wiadomości') return
    setLoadingMsgs(true)
    const supabase = createClient()
    supabase
      .from('outreach_messages')
      .select('*')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setMessages(data ?? []); setLoadingMsgs(false) })
  }, [activeTab, deal.id])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Skopiowano!')
  }, [])

  const saveNotes = async () => {
    setSavingNotes(true)
    await onUpdate(deal.id, { notes, diagnosis_notes: diagnosisNotes, client_problem: clientProblem })
    setSavingNotes(false)
    toast.success('Zapisano')
  }

  const generateBrief = async () => {
    setLoadingBrief(true)
    setBrief(null)
    try {
      const res = await fetch('/api/ai/pre-call-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: deal.lead_id, dealId: deal.id }),
      })
      const { brief: data, error } = await res.json()
      if (error) throw new Error(error)
      setBrief(data)
    } catch {
      toast.error('Błąd generowania briefu')
    } finally {
      setLoadingBrief(false)
    }
  }

  const matchOffer = async () => {
    setLoadingMatch(true)
    setMatchResult(null)
    try {
      const res = await fetch('/api/ai/match-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: deal.lead_id,
          dealId: deal.id,
          diagnosisNotes,
          clientProblem,
        }),
      })
      const { result, error } = await res.json()
      if (error) throw new Error(error)
      setMatchResult(result)
      // Auto-populate deal fields from match result
      if (result.price_range_min && result.price_range_max) {
        await onUpdate(deal.id, {
          suggested_price_min: result.price_range_min,
          suggested_price_max: result.price_range_max,
          client_problem: result.problem_summary ?? clientProblem,
        })
      }
      toast.success('Oferta dopasowana!')
    } catch {
      toast.error('Błąd dopasowania oferty')
    } finally {
      setLoadingMatch(false)
    }
  }

  const handleObjection = async () => {
    if (!objection.trim()) return
    setLoadingObj(true)
    setObjResult(null)
    try {
      const res = await fetch('/api/ai/handle-objection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectionText: objection,
          leadId: deal.lead_id,
          dealId: deal.id,
        }),
      })
      const { result, error } = await res.json()
      if (error) throw new Error(error)
      setObjResult(result)
    } catch {
      toast.error('Błąd generowania odpowiedzi')
    } finally {
      setLoadingObj(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 w-full max-w-[540px] bg-[#16213E] border-l border-white/10 z-50 flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: `${stage?.hex ?? '#555'}22`,
                  color: stage?.hex ?? '#aaa',
                  border: `1px solid ${stage?.hex ?? '#555'}35`,
                }}
              >
                {stage?.label ?? deal.stage}
              </span>
              {daysInStage > 0 && (
                <span className="text-[10px] text-white/30 flex items-center gap-1">
                  <Clock size={10} />
                  {daysInStage}d
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-white leading-snug truncate">{deal.title}</h2>
            {deal.lead && (
              <p className="text-sm text-white/40 mt-0.5 truncate">
                {leadFullName(deal.lead)} · {deal.lead.company}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 mt-0.5">
            <X size={16} className="text-white/50" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-2 flex-shrink-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ─── Szczegóły ─────────────────────────────────────── */}
          {activeTab === 'Szczegóły' && (
            <>
              {deal.lead && (
                <Section label="Lead">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar letter={deal.lead.first_name?.[0]} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{leadFullName(deal.lead)}</p>
                      <p className="text-xs text-white/40 truncate">
                        {deal.lead.position ?? '—'} · {deal.lead.company}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {deal.lead.email && (
                      <a href={`mailto:${deal.lead.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Mail size={13} className="text-white/30 flex-shrink-0" />
                        {deal.lead.email}
                      </a>
                    )}
                    {deal.lead.linkedin_url && (
                      <a href={deal.lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#74B9FF] hover:underline">
                        <ExternalLink size={13} className="text-white/30 flex-shrink-0" />
                        LinkedIn
                      </a>
                    )}
                    {deal.lead.segment && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-xs text-white/30">Segment:</span>
                        <Badge variant="default">{deal.lead.segment}</Badge>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {deal.lead?.ai_score != null && (
                <Section label="AI Scoring">
                  <div className="bg-[#1A1A2E] rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-black tabular-nums ${AI_SCORE_LABELS[deal.lead.ai_score]?.color ?? 'text-white'}`}>
                        {deal.lead.ai_score}/10
                      </span>
                      <span className="text-sm text-white/50">{AI_SCORE_LABELS[deal.lead.ai_score]?.label}</span>
                    </div>
                    {deal.lead.ai_problem && (
                      <p className="text-xs text-white/60 leading-relaxed">
                        <span className="text-white/30">Problem: </span>{deal.lead.ai_problem}
                      </p>
                    )}
                    {deal.lead.ai_icebreaker && (
                      <div className="flex items-start gap-2">
                        <p className="text-xs text-white/60 leading-relaxed flex-1">
                          <span className="text-white/30">Icebreaker: </span>{deal.lead.ai_icebreaker}
                        </p>
                        <button onClick={() => copy(deal.lead!.ai_icebreaker!)} className="p-1 hover:bg-white/10 rounded flex-shrink-0">
                          <Copy size={11} className="text-white/30" />
                        </button>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              <Section label="Deal">
                <div className="grid grid-cols-2 gap-2">
                  <InfoBlock label="Wartość" value={deal.value != null ? formatCurrency(deal.value) : '—'} valueClass="text-secondary" />
                  <InfoBlock label="Zamknięcie" value={deal.expected_close_date ? formatDate(deal.expected_close_date) : '—'} />
                  {deal.project_type && (
                    <div className="col-span-2 bg-[#1A1A2E] rounded-lg p-2.5">
                      <p className="text-[10px] text-white/30 mb-0.5">Typ projektu</p>
                      <p className="text-sm text-white">{deal.project_type}</p>
                    </div>
                  )}
                </div>
              </Section>

              {/* Objection handler — visible when in negocjacje */}
              {deal.stage === 'negocjacje' && (
                <Section label="Pomoc AI — obiekcje">
                  <div className="bg-[#1A1A2E] rounded-xl p-3 space-y-3">
                    <p className="text-xs text-white/40">Wpisz obiekcję klienta, AI zaproponuje 3 odpowiedzi</p>
                    <textarea
                      value={objection}
                      onChange={(e) => setObjection(e.target.value)}
                      placeholder="np. Za drogo, mam już kogoś, nie teraz…"
                      rows={2}
                      className="w-full bg-[#16213E] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                    <button
                      onClick={handleObjection}
                      disabled={loadingObj || !objection.trim()}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-40"
                    >
                      {loadingObj ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {loadingObj ? 'Generuję…' : 'Pomoc AI'}
                    </button>

                    {objResult && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">
                          Typ: {objResult.objection_type}
                        </p>
                        {objResult.responses.map((r, i) => (
                          <div key={i} className="bg-[#16213E] border border-white/5 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-medium text-primary">{r.approach}</span>
                              <button onClick={() => copy(r.text)} className="p-1 hover:bg-white/10 rounded transition-colors">
                                <Copy size={10} className="text-white/30" />
                              </button>
                            </div>
                            <p className="text-xs text-white/70 leading-relaxed">{r.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>
              )}

              <Section label="Notatki">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Dodaj notatki…"
                  rows={4}
                  className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <Button size="sm" className="mt-2" onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes ? 'Zapisywanie…' : 'Zapisz'}
                </Button>
              </Section>
            </>
          )}

          {/* ─── Wiadomości ────────────────────────────────────── */}
          {activeTab === 'Wiadomości' && (
            loadingMsgs ? (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare size={32} className="text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">Brak wiadomości outreach</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-[#1A1A2E] border border-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-[10px] font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded-full truncate">
                        {msg.message_type.replace(/_/g, ' ')}
                      </span>
                      <Badge variant={
                        msg.status === 'replied_positive' ? 'success'
                        : msg.status === 'replied_negative' ? 'danger'
                        : msg.status === 'sent' ? 'info' : 'default'
                      }>{msg.status}</Badge>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed mb-2 line-clamp-4">
                      {msg.message_content}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/20">{timeAgo(msg.created_at)}</span>
                      <button onClick={() => copy(msg.message_content)} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/70 transition-colors">
                        <Copy size={10} />Kopiuj
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── Rozmowa ───────────────────────────────────────── */}
          {activeTab === 'Rozmowa' && (
            <>
              {/* Pre-call brief — AI generated */}
              <Section label="Pre-call brief">
                <div className="bg-[#1A1A2E] border border-primary/20 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-primary" />
                      <span className="text-[10px] text-primary font-medium uppercase tracking-wider">AI Brief</span>
                    </div>
                    <button
                      onClick={generateBrief}
                      disabled={loadingBrief}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {loadingBrief
                        ? <><Loader2 size={11} className="animate-spin" /> Generuję…</>
                        : <><Sparkles size={11} /> Generuj brief</>}
                    </button>
                  </div>

                  {brief ? (
                    <div className="space-y-3">
                      <BriefSection label="Firma" text={brief.company_overview} onCopy={copy} />
                      <BriefSection label="Hook otwierający" text={brief.opening_hook} onCopy={copy} accent />
                      <BriefListSection label="Sygnały zakupowe" items={brief.buying_signals} />
                      <BriefListSection label="Sugerowane pytania" items={brief.suggested_questions} />
                      <BriefListSection label="Potencjalne rozwiązania" items={brief.potential_solutions} />
                      <BriefListSection label="Czego unikać" items={brief.what_to_avoid} danger />
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 italic">
                      Kliknij „Generuj brief" aby AI przygotował briefing przed rozmową
                    </p>
                  )}
                </div>
              </Section>

              {/* Skrypt rozmowy */}
              <Section label="Skrypt rozmowy">
                <CallScriptAccordion lead={deal.lead} onCopy={copy} />
              </Section>

              {/* Diagnosis notes */}
              <Section label="Notatki z diagnozy">
                <textarea
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  placeholder="Co powiedział klient? Jakie problemy zgłosił?"
                  rows={3}
                  className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <textarea
                  value={clientProblem}
                  onChange={(e) => setClientProblem(e.target.value)}
                  placeholder="Sformułuj problem klienta jednym zdaniem…"
                  rows={2}
                  className="w-full mt-2 bg-[#1A1A2E] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={saveNotes} disabled={savingNotes}>
                    {savingNotes ? 'Zapisywanie…' : 'Zapisz notatki'}
                  </Button>
                  <button
                    onClick={matchOffer}
                    disabled={loadingMatch || (!diagnosisNotes.trim() && !clientProblem.trim())}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/30 text-secondary text-xs font-medium hover:bg-secondary/20 transition-colors disabled:opacity-40"
                  >
                    {loadingMatch
                      ? <><Loader2 size={12} className="animate-spin" /> Dopasowuję…</>
                      : <><Sparkles size={12} /> Dopasuj ofertę AI</>}
                  </button>
                </div>
              </Section>

              {/* Match offer result */}
              {matchResult && (
                <Section label="Rekomendacja oferty AI">
                  <MatchOfferCard result={matchResult} onCopy={copy} />
                </Section>
              )}
            </>
          )}

          {/* ─── Oferta ────────────────────────────────────────── */}
          {activeTab === 'Oferta' && (
            <>
              {/* Generator CTA */}
              <Section label="Generator oferty">
                <Link href={`/sales/${deal.id}/offer`}>
                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                    <Plus size={14} />
                    Stwórz nową ofertę PDF
                  </button>
                </Link>
              </Section>

              {/* PDF status */}
              <Section label="Status oferty">
                {deal.offer_pdf_url ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-[#00B894]/10 border border-[#00B894]/25 rounded-xl px-3 py-2.5">
                      <FileText size={14} className="text-secondary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-secondary">Oferta wygenerowana</p>
                        {deal.offer_sent_at && (
                          <p className="text-[10px] text-white/30 mt-0.5">{formatDate(deal.offer_sent_at)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={deal.offer_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-white/60 text-xs hover:bg-white/5 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Otwórz PDF
                      </a>
                      <a
                        href={deal.offer_pdf_url}
                        download
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-white/60 text-xs hover:bg-white/5 transition-colors"
                      >
                        <Download size={12} />
                        Pobierz
                      </a>
                    </div>
                    {/* PDF Preview */}
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-[#1A1A2E]">
                      <p className="text-[10px] text-white/30 px-3 py-2 border-b border-white/5">Podgląd</p>
                      <iframe
                        src={`${deal.offer_pdf_url}#view=FitH`}
                        className="w-full h-64"
                        title="Podgląd oferty PDF"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5">
                    <FileText size={14} className="text-white/25 flex-shrink-0" />
                    <p className="text-xs text-white/30">Oferta nie wygenerowana</p>
                  </div>
                )}
              </Section>

              {/* Wycena — from matchResult or deal fields */}
              <Section label="Wycena">
                <div className="bg-[#1A1A2E] border border-white/10 rounded-xl p-4">
                  {(matchResult?.price_range_min ?? deal.suggested_price_min) != null ? (
                    <>
                      <p className="text-xs text-white/30 mb-1">Zakres wyceny</p>
                      <p className="text-2xl font-black text-primary tabular-nums">
                        {formatCurrency(matchResult?.price_range_min ?? deal.suggested_price_min ?? 0)} –{' '}
                        {formatCurrency(matchResult?.price_range_max ?? deal.suggested_price_max ?? 0)}
                      </p>
                      {(matchResult?.estimated_time ?? deal.project_type) && (
                        <p className="text-xs text-secondary mt-1 font-medium">
                          ⏱ {matchResult?.estimated_time ?? deal.project_type}
                        </p>
                      )}
                    </>
                  ) : deal.value != null ? (
                    <>
                      <p className="text-xs text-white/30 mb-1">Wartość deala</p>
                      <p className="text-2xl font-black text-secondary tabular-nums">
                        {formatCurrency(deal.value)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-white/30">
                      Uzupełnij diagnozę i użyj „Dopasuj ofertę AI" w zakładce Rozmowa
                    </p>
                  )}
                </div>
              </Section>

              {/* Tracking */}
              <Section label="Tracking oferty">
                <div className="space-y-2.5">
                  <TrackRow label="Wysłana"       value={deal.offer_sent_at   ? formatDate(deal.offer_sent_at)   : '—'} />
                  <TrackRow label="Otwarta"       value={deal.offer_opened_at ? formatDate(deal.offer_opened_at) : '—'} />
                  <TrackRow label="Liczba otwarć" value={String(deal.offer_open_count ?? 0)} />
                </div>
              </Section>

              {/* Legacy PDF generator (match offer) */}
              <OfferPDFButton
                deal={deal}
                matchResult={matchResult}
                onUpdate={onUpdate}
              />
            </>
          )}

          {/* ─── Historia ──────────────────────────────────────── */}
          {activeTab === 'Historia' && (
            <Section label="Timeline">
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-white/10" />
                <div className="space-y-5">
                  {([
                    { date: deal.created_at,       label: 'Deal utworzony',           sub: 'Etap: Nowy lead',  color: '#6C5CE7' },
                    deal.stage_changed_at && deal.stage_changed_at !== deal.created_at
                      ? { date: deal.stage_changed_at, label: `Zmiana etapu → ${stage?.label ?? deal.stage}`, sub: null, color: stage?.hex ?? '#555' }
                      : null,
                    deal.offer_sent_at   ? { date: deal.offer_sent_at,   label: 'Oferta wysłana',     sub: null, color: '#E17055' } : null,
                    deal.offer_opened_at ? { date: deal.offer_opened_at, label: 'Oferta otwarta',     sub: `${deal.offer_open_count ?? 1}× otwarto`, color: '#FDCB6E' } : null,
                    deal.won_at          ? { date: deal.won_at,          label: '🏆 Deal wygrany',    sub: deal.value != null ? formatCurrency(deal.value) : null, color: '#27AE60' } : null,
                    deal.lost_at         ? { date: deal.lost_at,         label: 'Deal przegrany',     sub: deal.lost_reason ?? null, color: '#636E72' } : null,
                    deal.reengagement_date ? { date: deal.reengagement_date, label: 'Planowany reengagement', sub: 'Nie teraz', color: '#B2BEC3' } : null,
                  ] as Array<{ date: string; label: string; sub: string | null; color: string } | null>)
                    .filter(Boolean)
                    .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime())
                    .map((ev, i) => ev && (
                      <div key={i} className="relative">
                        <span
                          className="absolute -left-6 mt-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#16213E]"
                          style={{ background: ev.color }}
                        />
                        <p className="text-sm text-white leading-snug">{ev.label}</p>
                        {ev.sub && <p className="text-xs text-white/40 mt-0.5">{ev.sub}</p>}
                        <p className="text-[10px] text-white/20 mt-0.5">{formatDate(ev.date)} · {timeAgo(ev.date)}</p>
                      </div>
                    ))}
                </div>
              </div>
            </Section>
          )}

        </div>
      </aside>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">{label}</h3>
      {children}
    </section>
  )
}

function Avatar({ letter }: { letter?: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
      {letter?.toUpperCase() ?? '?'}
    </div>
  )
}

function InfoBlock({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-[#1A1A2E] rounded-lg p-2.5">
      <p className="text-[10px] text-white/30 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}

function TrackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs text-white/70 font-medium tabular-nums">{value}</span>
    </div>
  )
}

// Pre-call brief sub-sections

function BriefSection({
  label, text, onCopy, accent = false,
}: {
  label: string; text: string; onCopy: (t: string) => void; accent?: boolean
}) {
  return (
    <div className={`rounded-lg p-2.5 ${accent ? 'bg-primary/10 border border-primary/20' : 'bg-[#16213E]'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
        <button onClick={() => onCopy(text)} className="p-0.5 hover:bg-white/10 rounded transition-colors">
          <Copy size={10} className="text-white/25" />
        </button>
      </div>
      <p className="text-xs text-white/70 leading-relaxed">{text}</p>
    </div>
  )
}

function BriefListSection({
  label, items, danger = false,
}: {
  label: string; items: string[]; danger?: boolean
}) {
  return (
    <div>
      <p className={`text-[10px] uppercase tracking-wider mb-1.5 ${danger ? 'text-accent/70' : 'text-white/30'}`}>
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`text-xs flex-shrink-0 mt-0.5 ${danger ? 'text-accent' : 'text-secondary'}`}>
              {danger ? '✗' : '›'}
            </span>
            <p className="text-xs text-white/60 leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Call script accordion

const CALL_PHASES = [
  { phase: '1. Wstęp (30s)', content: 'Cześć [Imię]! Tu Adrian z AM Automations. Widziałem [sygnał] — mam dosłownie 5 minut. Możemy porozmawiać?' },
  { phase: '2. Diagnoza (5-10 min)', content: 'Jak teraz wygląda [problem]? Co Cię najbardziej boli — czas, koszt, utracone leady? Ile szacujesz, że kosztuje Cię to miesięcznie?' },
  { phase: '3. Propozycja wartości (2 min)', content: 'Dla firm takich jak Twoja robimy [rozwiązanie]. Ostatni klient w Twoim segmencie osiągnął [wynik] w [czas]. Chciałbyś zobaczyć?' },
  { phase: '4. Następny krok', content: 'Możemy umówić 30 min demo na tej lub przyszłej tygodniu. Kiedy masz okno we wtorek lub środę?' },
]

function CallScriptAccordion({ lead, onCopy }: { lead?: Deal['lead']; onCopy: (t: string) => void }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-1.5">
      {CALL_PHASES.map(({ phase, content }, i) => (
        <div key={i} className="bg-[#1A1A2E] border border-white/5 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-white/60 hover:text-white transition-colors"
          >
            {phase}
            {open === i ? <ChevronDown size={13} className="text-white/30" /> : <ChevronRight size={13} className="text-white/20" />}
          </button>
          {open === i && (
            <div className="px-3 pb-3 border-t border-white/5 pt-2.5 flex items-start gap-2">
              <p className="text-xs text-white/50 leading-relaxed flex-1">{content}</p>
              <button onClick={() => onCopy(content)} className="p-1 hover:bg-white/10 rounded flex-shrink-0">
                <Copy size={10} className="text-white/25" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Match offer result card

function MatchOfferCard({ result, onCopy }: { result: MatchOfferResult; onCopy: (t: string) => void }) {
  return (
    <div className="bg-[#1A1A2E] border border-secondary/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={12} className="text-secondary" />
        <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">AI Rekomendacja</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#16213E] rounded-lg p-2.5">
          <p className="text-[10px] text-white/30 mb-0.5">Typ projektu</p>
          <p className="text-sm font-bold text-white capitalize">{result.recommended_project_type}</p>
        </div>
        <div className="bg-[#16213E] rounded-lg p-2.5">
          <p className="text-[10px] text-white/30 mb-0.5">Czas realizacji</p>
          <p className="text-sm font-bold text-secondary">{result.estimated_time}</p>
        </div>
      </div>

      <div className="bg-primary/10 rounded-lg p-2.5">
        <p className="text-[10px] text-white/30 mb-0.5">Wycena</p>
        <p className="text-lg font-black text-primary tabular-nums">
          {formatCurrency(result.price_range_min)} – {formatCurrency(result.price_range_max)}
        </p>
      </div>

      {result.key_selling_points.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 mb-1.5 uppercase tracking-wider">Kluczowe korzyści</p>
          {result.key_selling_points.map((pt, i) => (
            <div key={i} className="flex items-start gap-2 mb-1">
              <span className="text-secondary text-xs">›</span>
              <p className="text-xs text-white/60">{pt}</p>
            </div>
          ))}
        </div>
      )}

      {result.roi_calculation && (
        <div className="bg-secondary/10 border-l-2 border-secondary p-3 rounded-r-xl">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-secondary font-medium uppercase tracking-wider">ROI</p>
            <button onClick={() => onCopy(result.roi_calculation)} className="p-0.5 hover:bg-white/10 rounded">
              <Copy size={10} className="text-white/25" />
            </button>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">{result.roi_calculation}</p>
        </div>
      )}
    </div>
  )
}
