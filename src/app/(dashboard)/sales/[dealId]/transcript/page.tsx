'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, FileText, Mic, ChevronDown, AlertCircle,
  TrendingUp, TrendingDown, Minus, ArrowLeft, Save, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type TranscriptSource = 'manual' | 'fireflies' | 'otter' | 'zoom' | 'teams' | 'meet'

interface PainPoint {
  pain_point: string
  severity: 'high' | 'medium' | 'low'
  quote: string | null
}

interface BuyingSignal {
  signal: string
  confidence: 'high' | 'medium' | 'low'
}

interface Objection {
  objection: string
  context: string
}

interface DiagnosisForDeal {
  client_problem: string
  suggested_solution: string
  diagnosis_notes: string
}

type Sentiment = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'

interface AnalysisResult {
  summary: string
  pain_points: PainPoint[]
  buying_signals: BuyingSignal[]
  objections: Objection[]
  next_steps: string
  sentiment: Sentiment
  deal_probability: number
  diagnosis_for_deal: DiagnosisForDeal
}

const SOURCE_LABELS: Record<TranscriptSource, string> = {
  manual:    'Wpisany ręcznie',
  fireflies: 'Fireflies.ai',
  otter:     'Otter.ai',
  zoom:      'Zoom Transcript',
  teams:     'Microsoft Teams',
  meet:      'Google Meet',
}

const SENTIMENT_CONFIG: Record<Sentiment, { label: string; color: string; bg: string }> = {
  very_positive: { label: 'Bardzo pozytywny', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  positive:      { label: 'Pozytywny',         color: 'text-green-400',   bg: 'bg-green-500/15' },
  neutral:       { label: 'Neutralny',          color: 'text-yellow-400',  bg: 'bg-yellow-500/15' },
  negative:      { label: 'Negatywny',          color: 'text-orange-400',  bg: 'bg-orange-500/15' },
  very_negative: { label: 'Bardzo negatywny',   color: 'text-red-400',     bg: 'bg-red-500/15' },
}

const SEVERITY_CONFIG = {
  high:   { label: 'Wysoki',  color: 'text-red-400',    bg: 'bg-red-500/15',    dot: 'bg-red-500' },
  medium: { label: 'Średni',  color: 'text-yellow-400', bg: 'bg-yellow-500/15', dot: 'bg-yellow-500' },
  low:    { label: 'Niski',   color: 'text-blue-400',   bg: 'bg-blue-500/15',   dot: 'bg-blue-400' },
}

const CONFIDENCE_CONFIG = {
  high:   { label: 'Wysokie',  color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  medium: { label: 'Średnie',  color: 'text-yellow-400',  bg: 'bg-yellow-500/15' },
  low:    { label: 'Niskie',   color: 'text-white/40',    bg: 'bg-white/5' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TranscriptPage() {
  const { dealId } = useParams<{ dealId: string }>()
  const router = useRouter()

  const [deal, setDeal] = useState<{ id: string; title: string; lead?: { company?: string; first_name?: string; last_name?: string } } | null>(null)
  const [transcript, setTranscript] = useState('')
  const [source, setSource] = useState<TranscriptSource>('manual')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load deal
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('deals')
        .select('id, title, lead:leads(company, first_name, last_name)')
        .eq('id', dealId)
        .single()
      if (data) setDeal(data as typeof deal)
    }
    load()
  }, [dealId])

  // ── File drop ───────────────────────────────────────────────────────────────

  const handleFileRead = useCallback((file: File) => {
    if (!['text/plain', 'application/octet-stream'].includes(file.type) &&
        !file.name.match(/\.(txt|srt|vtt)$/i)) {
      toast.error('Akceptowane formaty: .txt, .srt, .vtt')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      // Strip SRT/VTT timestamps
      const cleaned = text
        .replace(/^\d+\s*\n/gm, '')
        .replace(/\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*\n?/g, '')
        .replace(/^WEBVTT.*\n?/m, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      setTranscript(cleaned)
      toast.success(`Wczytano: ${file.name}`)
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileRead(file)
  }, [handleFileRead])

  // ── Analyze ─────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      toast.error('Wklej lub wczytaj transkrypcję')
      return
    }
    if (transcript.trim().length < 100) {
      toast.error('Transkrypcja jest za krótka (min. 100 znaków)')
      return
    }

    setAnalyzing(true)
    try {
      const leadCtx = deal?.lead
        ? `Klient: ${deal.lead.first_name ?? ''} ${deal.lead.last_name ?? ''} z firmy ${deal.lead.company ?? ''}`
        : undefined

      const res = await fetch('/api/ai/analyze-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          deal_id: dealId,
          lead_context: leadCtx,
        }),
      })
      const { result: analysisResult, error } = await res.json()
      if (error) throw new Error(error)
      setResult(analysisResult)
      toast.success('Analiza gotowa!')
    } catch (err) {
      console.error(err)
      toast.error('Błąd analizy — spróbuj ponownie')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Save to deal ─────────────────────────────────────────────────────────────

  const handleSaveToDeal = async () => {
    if (!result) return
    setSaving(true)
    try {
      const supabase = createClient()
      const updates: Record<string, unknown> = {
        transcript_source: source,
        diagnosis_notes: result.diagnosis_for_deal.diagnosis_notes,
      }
      if (result.diagnosis_for_deal.client_problem) {
        updates.client_problem = result.diagnosis_for_deal.client_problem
      }
      if (result.diagnosis_for_deal.suggested_solution) {
        updates.suggested_solution = result.diagnosis_for_deal.suggested_solution
      }

      const { error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', dealId)

      if (error) throw error

      // Also save transcript record if table exists
      await supabase
        .from('call_transcripts')
        .insert({
          deal_id: dealId,
          transcript_text: transcript,
          source,
          analysis: result,
        })
        .select()

      toast.success('Zapisano do dealu!')
      router.push(`/sales/${dealId}`)
    } catch (err) {
      console.error(err)
      toast.error('Błąd zapisu')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl space-y-6">

      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/sales/${dealId}`}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">AI Shadowing</h1>
          {deal && (
            <p className="text-sm text-white/40 mt-0.5">
              {deal.lead?.company ?? deal.title}
            </p>
          )}
        </div>
      </div>

      {/* Input card */}
      <div className="bg-card border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Transkrypcja rozmowy</h2>

          {/* Source dropdown */}
          <div className="relative">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as TranscriptSource)}
              className="appearance-none bg-[#1A1A2E] border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-xs text-white/60 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
            >
              {(Object.keys(SOURCE_LABELS) as TranscriptSource[]).map((k) => (
                <option key={k} value={k}>{SOURCE_LABELS[k]}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl transition-all ${
            isDragging
              ? 'border-primary/70 bg-primary/5'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {transcript ? (
            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full bg-transparent p-4 text-xs text-white/70 leading-relaxed focus:outline-none resize-none rounded-xl"
                style={{ minHeight: '220px', maxHeight: '400px' }}
                placeholder="Wklej transkrypcję tutaj…"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="text-[10px] text-white/20">{transcript.length} znaków</span>
                <button
                  onClick={() => setTranscript('')}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                >
                  wyczyść
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-10 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={28} className="text-white/20 mb-3" />
              <p className="text-sm text-white/40">Przeciągnij plik <span className="text-white/60 font-medium">.txt / .srt / .vtt</span></p>
              <p className="text-xs text-white/25 mt-1">lub kliknij żeby wybrać plik</p>
              <p className="text-xs text-white/20 mt-3">możesz też wkleić tekst bezpośrednio</p>
            </div>
          )}
        </div>

        {/* Paste trigger if empty */}
        {!transcript && (
          <textarea
            className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl p-3 text-xs text-white/70 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            style={{ minHeight: '80px' }}
            placeholder="…lub wklej transkrypcję tutaj"
            onChange={(e) => e.target.value && setTranscript(e.target.value)}
          />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.srt,.vtt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileRead(file)
            e.target.value = ''
          }}
        />

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !transcript.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' }}
        >
          {analyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Analizuję z GPT-4o…
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Analizuj z AI
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">

          {/* Summary + sentiment + probability */}
          <div className="bg-card border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Podsumowanie</h3>
                <p className="text-sm text-white/80 leading-relaxed">{result.summary}</p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${SENTIMENT_CONFIG[result.sentiment].bg} ${SENTIMENT_CONFIG[result.sentiment].color}`}>
                  {SENTIMENT_CONFIG[result.sentiment].label}
                </span>
              </div>
            </div>

            {/* Deal probability bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-white/40">Prawdopodobieństwo dealu</span>
                <span className="text-sm font-bold text-white">{result.deal_probability}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${result.deal_probability}%`,
                    background: result.deal_probability >= 70
                      ? 'linear-gradient(90deg, #00B894, #00CEC9)'
                      : result.deal_probability >= 40
                      ? 'linear-gradient(90deg, #FDCB6E, #E17055)'
                      : 'linear-gradient(90deg, #E17055, #d63031)',
                  }}
                />
              </div>
            </div>

            {/* Next steps */}
            {result.next_steps && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-primary mb-1">Następne kroki</p>
                <p className="text-xs text-white/70">{result.next_steps}</p>
              </div>
            )}
          </div>

          {/* Pain points */}
          {result.pain_points?.length > 0 && (
            <div className="bg-card border border-white/5 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingDown size={12} className="text-red-400" />
                Pain Pointy ({result.pain_points.length})
              </h3>
              <div className="space-y-2">
                {result.pain_points.map((pp, i) => {
                  const cfg = SEVERITY_CONFIG[pp.severity]
                  return (
                    <div key={i} className="bg-[#1A1A2E] rounded-xl p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white/80 flex-1">{pp.pain_point}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {pp.quote && (
                        <p className="text-xs text-white/40 italic border-l-2 border-white/10 pl-2">
                          &ldquo;{pp.quote}&rdquo;
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Buying signals */}
          {result.buying_signals?.length > 0 && (
            <div className="bg-card border border-white/5 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp size={12} className="text-emerald-400" />
                Sygnały zakupowe ({result.buying_signals.length})
              </h3>
              <div className="space-y-2">
                {result.buying_signals.map((bs, i) => {
                  const cfg = CONFIDENCE_CONFIG[bs.confidence]
                  return (
                    <div key={i} className="bg-[#1A1A2E] rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                      <p className="text-sm text-white/80 flex-1">{bs.signal}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Objections */}
          {result.objections?.length > 0 && (
            <div className="bg-card border border-white/5 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertCircle size={12} className="text-orange-400" />
                Obiekcje ({result.objections.length})
              </h3>
              <div className="space-y-2">
                {result.objections.map((obj, i) => (
                  <div key={i} className="bg-[#1A1A2E] rounded-xl p-3 space-y-1">
                    <p className="text-sm text-white/80">{obj.objection}</p>
                    {obj.context && (
                      <p className="text-xs text-white/35">{obj.context}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnosis for deal */}
          <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
              <FileText size={12} />
              Diagnoza do dealu
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-white/40 mb-1">Problem klienta</p>
                <p className="text-sm text-white/80 leading-relaxed">{result.diagnosis_for_deal.client_problem}</p>
              </div>
              <div>
                <p className="text-[11px] text-white/40 mb-1">Sugerowane rozwiązanie</p>
                <p className="text-sm text-white/80 leading-relaxed">{result.diagnosis_for_deal.suggested_solution}</p>
              </div>
              <div>
                <p className="text-[11px] text-white/40 mb-1">Notatki z rozmowy</p>
                <p className="text-sm text-white/70 leading-relaxed">{result.diagnosis_for_deal.diagnosis_notes}</p>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveToDeal}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/20 border border-primary/30 text-sm font-semibold text-primary hover:bg-primary/30 transition-all disabled:opacity-50 mt-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                  Zapisuję…
                </>
              ) : (
                <>
                  <Save size={14} />
                  Zapisz i uzupełnij deal
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
