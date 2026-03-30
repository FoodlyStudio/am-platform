'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useContent } from '@/hooks/useContent'
import { ContentItem } from '@/types'
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  RefreshCw,
  Lightbulb,
  Clock,
  ArrowRight,
  X,
  AlignLeft,
  Layout,
  Repeat2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format as dateFmt } from 'date-fns'
import { pl } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

type GeneratorTab = 'carousel' | 'linkedin' | 'repurpose'

interface Slide {
  number: number
  text: string
  note?: string
}

interface LinkedInResult {
  post: string
  hashtags: string[]
  estimated_reach_min: number
  estimated_reach_max: number
  char_count: number
}

interface RepurposeResult {
  carousel?: { title: string; slides: Slide[] }
  facebook?: { post: string; hashtags: string[] }
  story?: { screens: { number: number; text: string; hint?: string }[] }
  reel?: { duration: string; hook_line: string; script: string; caption: string }
  newsletter?: { subject: string; snippet: string; preview_text: string }
}

interface SuggestedTopic {
  title: string
  format: string
  why: string
  hook: string
}

interface HistoryItem {
  id: string
  type: GeneratorTab
  topic: string
  preview: string
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const SEGMENTS = [
  { value: 'gabinety_med', label: 'Gabinety medyczne' },
  { value: 'kancelarie', label: 'Kancelarie prawne' },
  { value: 'beauty', label: 'Beauty & SPA' },
  { value: 'budowlanka', label: 'Budowlanka / Remonty' },
  { value: 'szkolenia', label: 'Szkolenia / Coaching' },
  { value: 'nieruchomosci', label: 'Nieruchomości' },
  { value: 'it_male', label: 'Małe firmy IT' },
  { value: 'ogolny', label: 'Ogólny' },
]

const TONES = [
  { value: 'premium', label: 'Premium / Technologiczny' },
  { value: 'conversational', label: 'Konwersacyjny / Przyjazny' },
  { value: 'educational', label: 'Edukacyjny / Ekspercki' },
  { value: 'direct', label: 'Bezpośredni / Sprzedażowy' },
]

const POST_TYPES = [
  { value: 'edukacyjny', label: 'Edukacyjny' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'behind_scenes', label: 'Za kulisami' },
  { value: 'tips', label: 'Lista porad' },
  { value: 'proces_am', label: 'Proces AM Automations' },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-white/50 block mb-1">{children}</label>
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
    />
  )
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 appearance-none transition-all"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function GenerateButton({
  onClick,
  loading,
  disabled,
}: {
  onClick: () => void
  loading: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
      {loading ? 'Generuję…' : 'Generuj'}
    </button>
  )
}

function CopyButton({ text, label = 'Kopiuj' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Skopiowano')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-xs transition-colors"
    >
      {copied ? <Check size={12} className="text-secondary" /> : <Copy size={12} />}
      {copied ? 'Skopiowano' : label}
    </button>
  )
}

// ─── Add to Calendar mini-modal ───────────────────────────────────────────────

interface CalendarData {
  channel: ContentItem['channel']
  content_type: ContentItem['content_type']
  title: string
  content_body?: string
  hook?: string
  hashtags?: string[]
}

function AddToCalendarModal({
  data,
  onClose,
  onCreate,
}: {
  data: CalendarData
  onClose: () => void
  onCreate: (item: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
}) {
  const [date, setDate] = useState(dateFmt(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('09:00')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onCreate({
        ...data,
        scheduled_date: date,
        scheduled_time: time,
        status: 'ready',
      })
      toast.success('Dodano do kalendarza')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-white/10 rounded-2xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Dodaj do kalendarza</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-white/50 truncate mb-4">"{data.title}"</p>
        <div className="space-y-3">
          <div>
            <FieldLabel>Data publikacji</FieldLabel>
            <TextInput type="date" value={date} onChange={setDate} />
          </div>
          <div>
            <FieldLabel>Godzina</FieldLabel>
            <TextInput type="time" value={time} onChange={setTime} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Zaplanuj
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Carousel Tab ─────────────────────────────────────────────────────────────

function CarouselTab({
  onGenerated,
  onAddToCalendar,
  suggestedTopics,
}: {
  onGenerated: (item: HistoryItem) => void
  onAddToCalendar: (data: CalendarData) => void
  suggestedTopics: SuggestedTopic[]
}) {
  const [topic, setTopic] = useState('')
  const [slideCount, setSlideCount] = useState(7)
  const [segment, setSegment] = useState('ogolny')
  const [tone, setTone] = useState('premium')
  const [slides, setSlides] = useState<Slide[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!topic.trim()) return toast.error('Podaj temat karuzeli')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/generate-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slideCount, segment, tone }),
      })
      const { slides: s, error } = await res.json()
      if (error) throw new Error(error)
      setSlides(s ?? [])
      setCurrent(0)
      onGenerated({
        id: Date.now().toString(),
        type: 'carousel',
        topic,
        preview: s?.[0]?.text ?? '',
        created_at: new Date().toISOString(),
        data: { slides: s, topic, slideCount, segment, tone },
      })
    } catch {
      toast.error('Błąd generowania')
    } finally {
      setLoading(false)
    }
  }

  const copyAllForCanva = () => {
    const text = slides
      .map((s) => `--- SLAJD ${s.number} ---\n${s.text}\n[Wskazówka: ${s.note ?? '—'}]`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
    toast.success('Wszystkie slajdy skopiowane — wklej w Canva')
  }

  const slide = slides[current]

  // IG-style slide colors
  const SLIDE_GRADIENT = [
    'from-[#6C5CE7] to-[#a855f7]',
    'from-[#1A1A2E] to-[#2d2d44]',
    'from-[#6C5CE7]/80 to-[#00B894]/60',
    'from-[#1a1a2e] to-[#6C5CE7]/40',
  ]
  const gradientClass = SLIDE_GRADIENT[(current) % SLIDE_GRADIENT.length]

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <FieldLabel>Temat karuzeli</FieldLabel>
          <TextInput
            value={topic}
            onChange={setTopic}
            placeholder="np. Jak zaoszczędzić 5h tygodniowo automatyzując faktury"
          />
          {suggestedTopics.filter((t) => t.format === 'carousel').length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestedTopics
                .filter((t) => t.format === 'carousel')
                .map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setTopic(t.title)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 hover:bg-primary/20 transition-colors border border-primary/20"
                  >
                    {t.title}
                  </button>
                ))}
            </div>
          )}
        </div>
        <div>
          <FieldLabel>Segment docelowy</FieldLabel>
          <NativeSelect value={segment} onChange={setSegment} options={SEGMENTS} />
        </div>
        <div>
          <FieldLabel>Ton</FieldLabel>
          <NativeSelect value={tone} onChange={setTone} options={TONES} />
        </div>
        <div>
          <FieldLabel>Liczba slajdów ({slideCount})</FieldLabel>
          <input
            type="range"
            min={5}
            max={10}
            value={slideCount}
            onChange={(e) => setSlideCount(Number(e.target.value))}
            className="w-full accent-primary mt-1"
          />
          <div className="flex justify-between text-[10px] text-white/25 mt-0.5">
            <span>5</span><span>10</span>
          </div>
        </div>
        <div className="flex items-end">
          <GenerateButton onClick={generate} loading={loading} />
        </div>
      </div>

      {/* Preview */}
      {slides.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              Slajd {current + 1} / {slides.length}
            </span>
            <div className="flex gap-2">
              <CopyButton text={slide?.text ?? ''} label="Kopiuj slajd" />
              <button
                onClick={copyAllForCanva}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/15 border border-secondary/30 text-secondary text-xs hover:bg-secondary/25 transition-colors"
              >
                <Copy size={11} />
                Wyślij do Canva
              </button>
              <button
                onClick={() =>
                  onAddToCalendar({
                    channel: 'instagram',
                    content_type: 'carousel',
                    title: topic,
                    content_body: slides.map((s) => `[${s.number}] ${s.text}`).join('\n'),
                    hook: slides[0]?.text,
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-colors"
              >
                <CalendarPlus size={11} />
                Do kalendarza
              </button>
            </div>
          </div>

          {/* Slide card */}
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-25 flex-shrink-0"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              className={`flex-1 aspect-square max-w-[280px] mx-auto rounded-2xl bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-6 relative overflow-hidden`}
            >
              {/* Top label */}
              <div className="absolute top-3 left-3 right-3 flex justify-between">
                <span className="text-[9px] text-white/40 font-medium uppercase tracking-wider">
                  {current === 0 ? 'HOOK' : current === slides.length - 1 ? 'CTA' : `SLAJD ${current + 1}`}
                </span>
                <span className="text-[9px] text-white/30">AM Automations</span>
              </div>

              {/* Main text */}
              <p
                className={`text-center text-white font-bold leading-snug ${
                  (slide?.text?.length ?? 0) > 60 ? 'text-base' : 'text-xl'
                }`}
              >
                {slide?.text}
              </p>

              {/* Design note */}
              {slide?.note && (
                <p className="absolute bottom-3 left-3 right-3 text-[9px] text-white/30 text-center italic">
                  {slide.note}
                </p>
              )}

              {/* Slide number */}
              <div className="absolute top-3 right-3">
                <span className="text-[9px] text-white/25">
                  {current + 1}/{slides.length}
                </span>
              </div>
            </div>

            <button
              onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))}
              disabled={current === slides.length - 1}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-25 flex-shrink-0"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all ${
                  i === current ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* All slides list */}
          <div className="space-y-1.5">
            <p className="text-xs text-white/30 font-medium">Wszystkie slajdy</p>
            {slides.map((s, i) => (
              <button
                key={s.number}
                onClick={() => setCurrent(i)}
                className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                  i === current ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'
                }`}
              >
                <span
                  className={`text-[10px] font-bold w-5 flex-shrink-0 mt-0.5 ${
                    i === 0 ? 'text-[#cc2366]' : i === slides.length - 1 ? 'text-secondary' : 'text-primary'
                  }`}
                >
                  {i === 0 ? 'H' : i === slides.length - 1 ? 'CTA' : s.number}
                </span>
                <span className="text-xs text-white/70 leading-relaxed">{s.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LinkedIn Tab ─────────────────────────────────────────────────────────────

function LinkedInTab({
  onGenerated,
  onAddToCalendar,
  suggestedTopics,
}: {
  onGenerated: (item: HistoryItem) => void
  onAddToCalendar: (data: CalendarData) => void
  suggestedTopics: SuggestedTopic[]
}) {
  const [topic, setTopic] = useState('')
  const [postType, setPostType] = useState('edukacyjny')
  const [result, setResult] = useState<LinkedInResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const generate = async () => {
    if (!topic.trim()) return toast.error('Podaj temat posta')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/generate-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, postType }),
      })
      const { result: r, error } = await res.json()
      if (error) throw new Error(error)
      setResult(r)
      setExpanded(true)
      onGenerated({
        id: Date.now().toString(),
        type: 'linkedin',
        topic,
        preview: r?.post?.slice(0, 80) ?? '',
        created_at: new Date().toISOString(),
        data: r,
      })
    } catch {
      toast.error('Błąd generowania')
    } finally {
      setLoading(false)
    }
  }

  const previewText = result?.post ?? ''
  const PREVIEW_LIMIT = 300
  const isLong = previewText.length > PREVIEW_LIMIT
  const displayText = isLong && !expanded ? previewText.slice(0, PREVIEW_LIMIT) + '…' : previewText

  const reachMin = result?.estimated_reach_min ?? 0
  const reachMax = result?.estimated_reach_max ?? 0
  const charCount = result?.char_count ?? (result?.post?.length ?? 0)

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <FieldLabel>Temat posta</FieldLabel>
          <TextInput
            value={topic}
            onChange={setTopic}
            placeholder="np. Dlaczego małe firmy tracą klientów przez wolną odpowiedź"
          />
          {suggestedTopics.filter((t) => t.format === 'linkedin').length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestedTopics
                .filter((t) => t.format === 'linkedin')
                .map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setTopic(t.title)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#0077B5]/15 text-[#0077B5] hover:bg-[#0077B5]/25 transition-colors border border-[#0077B5]/25"
                  >
                    {t.title}
                  </button>
                ))}
            </div>
          )}
        </div>
        <div>
          <FieldLabel>Typ posta</FieldLabel>
          <NativeSelect value={postType} onChange={setPostType} options={POST_TYPES} />
        </div>
        <GenerateButton onClick={generate} loading={loading} />
      </div>

      {/* Preview */}
      {result && (
        <div className="space-y-3">
          {/* Reach estimator */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0077B5]/10 border border-[#0077B5]/20">
            <span className="text-[11px] text-[#0077B5]/80">Szacowany zasięg:</span>
            <span className="text-sm font-bold text-[#0077B5]">
              {reachMin.toLocaleString('pl-PL')} — {reachMax.toLocaleString('pl-PL')} wyświetleń
            </span>
            <span className="ml-auto text-[11px] text-white/30">{charCount} / 1300 znaków</span>
          </div>

          {/* LinkedIn post mockup */}
          <div className="rounded-xl border border-white/10 bg-[#1b1b2e] overflow-hidden">
            {/* Author row */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/8">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                AM
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Adrian / AM Automations</p>
                <p className="text-[10px] text-white/40">Founder · AM Automations · 1h temu</p>
              </div>
            </div>

            {/* Post text */}
            <div className="px-4 py-3">
              <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                {displayText}
              </p>
              {isLong && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs text-[#0077B5] mt-1 hover:underline"
                >
                  {expanded ? 'Pokaż mniej' : 'Pokaż więcej'}
                </button>
              )}
              {/* Hashtags */}
              {result.hashtags?.length > 0 && (
                <p className="text-xs text-[#0077B5] mt-2">
                  {result.hashtags.map((h) => `#${h}`).join(' ')}
                </p>
              )}
            </div>

            {/* Reactions bar */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-white/8">
              {['👍 Lubię to', '💬 Komentarz', '🔄 Udostępnij'].map((a) => (
                <span key={a} className="text-[11px] text-white/25">{a}</span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <CopyButton
              text={`${result.post}\n\n${result.hashtags.map((h) => `#${h}`).join(' ')}`}
              label="Kopiuj post"
            />
            <button
              onClick={() =>
                onAddToCalendar({
                  channel: 'linkedin_personal',
                  content_type: 'linkedin_post',
                  title: topic,
                  content_body: result.post,
                  hashtags: result.hashtags,
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-colors"
            >
              <CalendarPlus size={11} />
              Do kalendarza
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Repurposing Tab ──────────────────────────────────────────────────────────

function RepurposingTab({
  calendarItems,
  onGenerated,
  onAddToCalendar,
}: {
  calendarItems: ContentItem[]
  onGenerated: (item: HistoryItem) => void
  onAddToCalendar: (data: CalendarData) => void
}) {
  const [sourceText, setSourceText] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState<RepurposeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedFormat, setExpandedFormat] = useState<string | null>('carousel')

  const publishedItems = calendarItems.filter(
    (i) => i.status === 'published' || i.status === 'scheduled',
  )

  const effectiveText =
    selectedId
      ? calendarItems.find((i) => i.id === selectedId)?.content_body ?? ''
      : sourceText

  const generate = async () => {
    if (!effectiveText.trim()) return toast.error('Wklej tekst lub wybierz post z kalendarza')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/repurpose-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceText: effectiveText }),
      })
      const { result: r, error } = await res.json()
      if (error) throw new Error(error)
      setResult(r)
      setExpandedFormat('carousel')
      onGenerated({
        id: Date.now().toString(),
        type: 'repurpose',
        topic: effectiveText.slice(0, 60),
        preview: 'Karuzela + FB + Story + Reel + Newsletter',
        created_at: new Date().toISOString(),
        data: r,
      })
    } catch {
      toast.error('Błąd generowania')
    } finally {
      setLoading(false)
    }
  }

  type FormatKey = 'carousel' | 'facebook' | 'story' | 'reel' | 'newsletter'
  const FORMAT_META: {
    key: FormatKey
    label: string
    channel: ContentItem['channel']
    type: ContentItem['content_type']
    color: string
  }[] = [
    { key: 'carousel', label: 'Karuzela Instagram', channel: 'instagram', type: 'carousel', color: '#cc2366' },
    { key: 'facebook', label: 'Post Facebook', channel: 'facebook', type: 'single_post', color: '#1877F2' },
    { key: 'story', label: 'Story Script (3-5 ekranów)', channel: 'instagram', type: 'story', color: '#FDCB6E' },
    { key: 'reel', label: 'Reel Script (30-60s)', channel: 'instagram', type: 'reel_script', color: '#00B894' },
    { key: 'newsletter', label: 'Newsletter Snippet', channel: 'newsletter', type: 'newsletter', color: '#6C5CE7' },
  ]

  const getFormatPreview = (key: FormatKey): string => {
    if (!result) return ''
    if (key === 'carousel') return result.carousel?.slides?.[0]?.text ?? ''
    if (key === 'facebook') return result.facebook?.post?.slice(0, 120) ?? ''
    if (key === 'story') return result.story?.screens?.[0]?.text ?? ''
    if (key === 'reel') return result.reel?.hook_line ?? ''
    if (key === 'newsletter') return result.newsletter?.snippet?.slice(0, 120) ?? ''
    return ''
  }

  const getFormatCopyText = (key: FormatKey): string => {
    if (!result) return ''
    if (key === 'carousel')
      return (result.carousel?.slides ?? [])
        .map((s) => `[${s.number}] ${s.text}`)
        .join('\n')
    if (key === 'facebook')
      return `${result.facebook?.post ?? ''}\n\n${(result.facebook?.hashtags ?? []).map((h) => `#${h}`).join(' ')}`
    if (key === 'story')
      return (result.story?.screens ?? [])
        .map((s) => `[Ekran ${s.number}] ${s.text}`)
        .join('\n')
    if (key === 'reel')
      return `Hook: ${result.reel?.hook_line ?? ''}\n\n${result.reel?.script ?? ''}`
    if (key === 'newsletter')
      return `Temat: ${result.newsletter?.subject ?? ''}\n\n${result.newsletter?.snippet ?? ''}`
    return ''
  }

  const getCalendarData = (key: FormatKey, fm: (typeof FORMAT_META)[0]): CalendarData => ({
    channel: fm.channel,
    content_type: fm.type,
    title: result?.carousel?.title ?? effectiveText.slice(0, 60),
    content_body: getFormatCopyText(key),
    hook:
      key === 'carousel' ? result?.carousel?.slides?.[0]?.text
      : key === 'reel' ? result?.reel?.hook_line
      : undefined,
  })

  return (
    <div className="space-y-5">
      {/* Source input */}
      <div className="space-y-3">
        {publishedItems.length > 0 && (
          <div>
            <FieldLabel>Wybierz post z kalendarza</FieldLabel>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value)
                if (e.target.value) setSourceText('')
              }}
              className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40 appearance-none"
            >
              <option value="">— lub wklej poniżej —</option>
              {publishedItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} ({i.channel})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <FieldLabel>Wklej istniejący post / treść</FieldLabel>
          <textarea
            value={selectedId ? (calendarItems.find((i) => i.id === selectedId)?.content_body ?? '') : sourceText}
            onChange={(e) => {
              setSourceText(e.target.value)
              setSelectedId('')
            }}
            placeholder="Wklej gotowy post, artykuł, lub dowolny fragment tekstu który chcesz przetworzyć..."
            rows={5}
            className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
          />
          <p className="text-[10px] text-white/25 mt-1 text-right">{effectiveText.length} znaków</p>
        </div>

        <GenerateButton onClick={generate} loading={loading} disabled={!effectiveText.trim()} />
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-2">
          <p className="text-xs text-white/40 font-medium">5 formatów gotowych do publikacji</p>
          {FORMAT_META.map((fm) => (
            <div
              key={fm.key}
              className="rounded-xl border border-white/8 overflow-hidden"
              style={{ borderLeftWidth: '3px', borderLeftColor: fm.color }}
            >
              <button
                onClick={() => setExpandedFormat(expandedFormat === fm.key ? null : fm.key)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: fm.color }} />
                <span className="text-sm font-medium text-white flex-1 text-left">{fm.label}</span>
                <span className="text-[10px] text-white/30 truncate max-w-[200px] text-right">
                  {getFormatPreview(fm.key)}
                </span>
                <ChevronRight
                  size={13}
                  className={`text-white/30 flex-shrink-0 transition-transform ${
                    expandedFormat === fm.key ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {expandedFormat === fm.key && (
                <div className="px-4 pb-4 border-t border-white/8 pt-3 bg-black/20">
                  {/* Carousel slides */}
                  {fm.key === 'carousel' && result.carousel && (
                    <div className="space-y-1.5 mb-3">
                      {result.carousel.slides.map((s) => (
                        <div key={s.number} className="flex gap-2 text-xs">
                          <span className="text-white/30 w-4 flex-shrink-0">{s.number}.</span>
                          <span className="text-white/75">{s.text}</span>
                          {s.note && <span className="text-white/25 italic">[{s.note}]</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Facebook */}
                  {fm.key === 'facebook' && result.facebook && (
                    <div className="mb-3">
                      <p className="text-sm text-white/75 whitespace-pre-wrap">{result.facebook.post}</p>
                      {result.facebook.hashtags?.length > 0 && (
                        <p className="text-xs text-[#1877F2] mt-1">
                          {result.facebook.hashtags.map((h) => `#${h}`).join(' ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Story */}
                  {fm.key === 'story' && result.story && (
                    <div className="space-y-2 mb-3">
                      {result.story.screens.map((s) => (
                        <div key={s.number} className="flex gap-2.5 text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold flex-shrink-0">
                            {s.number}
                          </span>
                          <div>
                            <span className="text-white/75">{s.text}</span>
                            {s.hint && <span className="text-white/30 italic ml-2">[{s.hint}]</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reel */}
                  {fm.key === 'reel' && result.reel && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/20 text-secondary">
                          {result.reel.duration}
                        </span>
                        <span className="text-xs text-white/50 italic">"{result.reel.hook_line}"</span>
                      </div>
                      <p className="text-xs text-white/60 whitespace-pre-wrap">{result.reel.script}</p>
                      {result.reel.caption && (
                        <div className="pt-2 border-t border-white/8">
                          <p className="text-[10px] text-white/35 italic">{result.reel.caption}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Newsletter */}
                  {fm.key === 'newsletter' && result.newsletter && (
                    <div className="space-y-1.5 mb-3">
                      <div>
                        <span className="text-[10px] text-white/30 uppercase tracking-wide">Temat:</span>
                        <p className="text-sm text-white font-medium">{result.newsletter.subject}</p>
                      </div>
                      <p className="text-xs text-white/65">{result.newsletter.snippet}</p>
                      {result.newsletter.preview_text && (
                        <p className="text-[10px] text-white/30 italic">
                          Preview: {result.newsletter.preview_text}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <CopyButton text={getFormatCopyText(fm.key)} label={`Kopiuj ${fm.label}`} />
                    <button
                      onClick={() => onAddToCalendar(getCalendarData(fm.key, fm))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-colors"
                    >
                      <CalendarPlus size={11} />
                      Do kalendarza
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const HISTORY_KEY = 'am_gen_history'

export default function GeneratorPage() {
  const { items, fetch: fetchItems, create } = useContent()
  const [activeTab, setActiveTab] = useState<GeneratorTab>('carousel')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [suggestedTopics, setSuggestedTopics] = useState<SuggestedTopic[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [calendarModal, setCalendarModal] = useState<CalendarData | null>(null)
  const didFetch = useRef(false)

  // Load data
  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true
    fetchItems()
    // Load history from localStorage
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch {}
    // Fetch suggested topics
    fetchTopics()
  }, [fetchItems])

  const fetchTopics = useCallback(async () => {
    setLoadingTopics(true)
    try {
      const res = await fetch('/api/ai/suggest-topics')
      const { topics } = await res.json()
      setSuggestedTopics(topics ?? [])
    } catch {
      // silently fail — topics are optional
    } finally {
      setLoadingTopics(false)
    }
  }, [])

  const addToHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 10)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleAddToCalendar = (data: CalendarData) => setCalendarModal(data)

  const handleCreate = async (item: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>) => {
    await create(item)
  }

  const TABS: { key: GeneratorTab; label: string; icon: React.ElementType }[] = [
    { key: 'carousel', label: 'Karuzela Instagram', icon: Layout },
    { key: 'linkedin', label: 'Post LinkedIn', icon: AlignLeft },
    { key: 'repurpose', label: 'Repurposing 1→5', icon: Repeat2 },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Generator Contentu</h1>
          <p className="text-sm text-white/40 mt-0.5">AI tworzy karuzele, posty i repurposing</p>
        </div>
      </div>

      {/* Top row: Suggested topics + History */}
      <div className="grid grid-cols-5 gap-4">
        {/* Suggested topics */}
        <div className="col-span-3 bg-card border border-white/8 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-primary" />
              <span className="text-xs font-semibold text-white">Sugerowane tematy</span>
            </div>
            <button
              onClick={fetchTopics}
              disabled={loadingTopics}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
            >
              {loadingTopics ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <RefreshCw size={11} />
              )}
              Odśwież
            </button>
          </div>

          {suggestedTopics.length === 0 ? (
            <div className="flex items-center justify-center h-16">
              {loadingTopics ? (
                <Loader2 size={16} className="animate-spin text-white/30" />
              ) : (
                <p className="text-xs text-white/25">Kliknij "Odśwież" aby wygenerować tematy</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {suggestedTopics.map((t, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => {
                    // Switch to the suggested tab and set topic
                    if (t.format === 'carousel') setActiveTab('carousel')
                    else if (t.format === 'linkedin') setActiveTab('linkedin')
                    else setActiveTab('repurpose')
                    toast.success(`Przełączono na ${t.format === 'carousel' ? 'Karuzelę' : 'LinkedIn'}`)
                  }}
                >
                  <span
                    className={`mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                      t.format === 'carousel'
                        ? 'bg-[#cc2366]/15 text-[#cc2366]'
                        : t.format === 'linkedin'
                        ? 'bg-[#0077B5]/15 text-[#0077B5]'
                        : 'bg-secondary/15 text-secondary'
                    }`}
                  >
                    {t.format === 'carousel' ? 'IG' : t.format === 'linkedin' ? 'LI' : 'RE'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">
                      {t.title}
                    </p>
                    <p className="text-[10px] text-white/35 mt-0.5 truncate">{t.why}</p>
                  </div>
                  <ArrowRight
                    size={11}
                    className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0 mt-0.5"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently generated */}
        <div className="col-span-2 bg-card border border-white/8 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-white/40" />
            <span className="text-xs font-semibold text-white">Ostatnio wygenerowane</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-6">Brak historii</p>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-[160px]">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setActiveTab(h.type)}
                  className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 mt-0.5 ${
                      h.type === 'carousel'
                        ? 'bg-[#cc2366]/15 text-[#cc2366]'
                        : h.type === 'linkedin'
                        ? 'bg-[#0077B5]/15 text-[#0077B5]'
                        : 'bg-secondary/15 text-secondary'
                    }`}
                  >
                    {h.type === 'carousel' ? 'IG' : h.type === 'linkedin' ? 'LI' : 'RE'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/70 truncate font-medium">{h.topic}</p>
                    <p className="text-[9px] text-white/30 truncate">{h.preview}</p>
                  </div>
                  <span className="text-[9px] text-white/20 flex-shrink-0">
                    {dateFmt(new Date(h.created_at), 'HH:mm', { locale: pl })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main generator card */}
      <div className="bg-card border border-white/8 rounded-2xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-white/8">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'carousel' && (
            <CarouselTab
              onGenerated={addToHistory}
              onAddToCalendar={handleAddToCalendar}
              suggestedTopics={suggestedTopics}
            />
          )}
          {activeTab === 'linkedin' && (
            <LinkedInTab
              onGenerated={addToHistory}
              onAddToCalendar={handleAddToCalendar}
              suggestedTopics={suggestedTopics}
            />
          )}
          {activeTab === 'repurpose' && (
            <RepurposingTab
              calendarItems={items}
              onGenerated={addToHistory}
              onAddToCalendar={handleAddToCalendar}
            />
          )}
        </div>
      </div>

      {/* Add to Calendar Modal */}
      {calendarModal && (
        <AddToCalendarModal
          data={calendarModal}
          onClose={() => setCalendarModal(null)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
