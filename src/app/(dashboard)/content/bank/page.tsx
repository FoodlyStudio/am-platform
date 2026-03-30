'use client'

import { useState, useEffect, useMemo, KeyboardEvent } from 'react'
import { useTemplates } from '@/hooks/useTemplates'
import { ContentTemplate, TemplateType, TemplateCategory } from '@/types'
import {
  Search,
  Plus,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Star,
  BarChart2,
  X,
  ChevronDown,
  ArrowUpDown,
  Wand2,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES: { value: TemplateType; label: string; color: string }[] = [
  { value: 'hook', label: 'Hook', color: '#cc2366' },
  { value: 'cta', label: 'CTA', color: '#00B894' },
  { value: 'carousel', label: 'Karuzela', color: '#6C5CE7' },
  { value: 'linkedin_post', label: 'LinkedIn Post', color: '#0077B5' },
  { value: 'reel_script', label: 'Reel Script', color: '#FDCB6E' },
  { value: 'ad_angle', label: 'Ad Angle', color: '#e17055' },
]

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'automation', label: 'Automatyzacja' },
  { value: 'trust', label: 'Zaufanie' },
  { value: 'urgency', label: 'Pilność' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'process', label: 'Proces' },
]

type SortMode = 'score' | 'used' | 'newest'

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ score = 0 }: { score?: number }) {
  const stars = score === 0 ? 0 : Math.max(1, Math.ceil((score / 100) * 5))
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={11}
          className={i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'}
        />
      ))}
      {score > 0 && <span className="text-[10px] text-white/30 ml-1">{score}</span>}
    </div>
  )
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const meta = TEMPLATE_TYPES.find((t) => t.value === type)
  if (!meta) return <span className="text-[10px] text-white/40">{type}</span>
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${meta.color}20`, color: meta.color }}
    >
      {meta.label}
    </span>
  )
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onUse,
  onMetrics,
  onDelete,
}: {
  template: ContentTemplate
  onUse: (t: ContentTemplate) => void
  onMetrics: (t: ContentTemplate) => void
  onDelete: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(template.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Skopiowano')
  }

  const catMeta = CATEGORIES.find((c) => c.value === template.category)
  const isNew = !template.performance_score && !template.times_used

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group bg-card border border-white/8 rounded-xl p-4 hover:border-white/20 transition-all flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{template.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <TypeBadge type={template.template_type} />
            {catMeta && (
              <span className="text-[10px] text-white/30">{catMeta.label}</span>
            )}
            {isNew && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary font-medium">
                Nowy
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(template.id) }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/25 hover:text-accent hover:bg-accent/10 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Content preview */}
      <div className="relative">
        <p
          className={`text-xs text-white/65 leading-relaxed transition-all ${
            hovered ? '' : 'line-clamp-3'
          }`}
        >
          {template.content}
        </p>
        {!hovered && template.content.length > 150 && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/8">
        <div className="flex flex-col gap-1">
          <StarRating score={template.performance_score} />
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            {(template.times_used ?? 0) > 0 && (
              <span>{template.times_used}× użyty</span>
            )}
            {template.perf_reach && template.perf_reach > 0 && (
              <span>zasięg: {template.perf_reach.toLocaleString('pl-PL')}</span>
            )}
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onMetrics(template) }}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
            title="Dodaj metryki"
          >
            <BarChart2 size={13} />
          </button>
          <button
            onClick={copy}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
            title="Kopiuj"
          >
            {copied ? <Check size={13} className="text-secondary" /> : <Copy size={13} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onUse(template) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
          >
            <ExternalLink size={11} />
            Użyj
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Template Modal ────────────────────────────────────────────────────────

interface GeneratedHook {
  text: string
  name: string
  strength?: string
  selected: boolean
}

function AddTemplateModal({
  onClose,
  onCreate,
  onCreateMany,
}: {
  onClose: () => void
  onCreate: (t: Omit<ContentTemplate, 'id' | 'created_at'>) => Promise<ContentTemplate | null>
  onCreateMany: (ts: Omit<ContentTemplate, 'id' | 'created_at'>[]) => Promise<number>
}) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')

  // Manual form
  const [name, setName] = useState('')
  const [type, setType] = useState<TemplateType>('hook')
  const [category, setCategory] = useState<TemplateCategory>('lead_generation')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  // AI form
  const [aiTopic, setAiTopic] = useState('')
  const [aiType, setAiType] = useState<TemplateType>('hook')
  const [aiCategory, setAiCategory] = useState<TemplateCategory>('lead_generation')
  const [aiCount, setAiCount] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<GeneratedHook[]>([])
  const [savingAI, setSavingAI] = useState(false)

  const handleManualSave = async () => {
    if (!name.trim() || !content.trim()) return toast.error('Wypełnij nazwę i treść')
    setSaving(true)
    try {
      await onCreate({ name, template_type: type, category, content })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) return toast.error('Podaj temat')
    setGenerating(true)
    setGenerated([])
    try {
      const res = await fetch('/api/ai/generate-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          templateType: aiType,
          category: aiCategory,
          count: aiCount,
        }),
      })
      const { items, error } = await res.json()
      if (error) throw new Error(error)
      setGenerated((items ?? []).map((i: Omit<GeneratedHook, 'selected'>) => ({ ...i, selected: false })))
    } catch {
      toast.error('Błąd generowania')
    } finally {
      setGenerating(false)
    }
  }

  const toggleSelect = (i: number) =>
    setGenerated((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, selected: !item.selected } : item)),
    )

  const selectAll = () =>
    setGenerated((prev) => prev.map((item) => ({ ...item, selected: true })))

  const handleAISave = async () => {
    const selected = generated.filter((g) => g.selected)
    if (selected.length === 0) return toast.error('Zaznacz przynajmniej jeden szablon')
    setSavingAI(true)
    try {
      await onCreateMany(
        selected.map((g) => ({
          name: g.name,
          template_type: aiType,
          category: aiCategory,
          content: g.text,
        })),
      )
      onClose()
    } finally {
      setSavingAI(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex gap-1 p-0.5 bg-dark rounded-lg">
            {(['manual', 'ai'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === m ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {m === 'ai' ? <Wand2 size={12} /> : <Plus size={12} />}
                {m === 'manual' ? 'Ręcznie' : 'Generuj z AI'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {mode === 'manual' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1">Nazwa szablonu</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Hook ROI dla gabinetów"
                  className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1">Typ</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TemplateType)}
                    className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    {TEMPLATE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1">Kategoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                    className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1">Treść szablonu</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Pełna treść szablonu gotowa do użycia..."
                  rows={5}
                  className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                />
                <p className="text-[10px] text-white/25 mt-1 text-right">{content.length} znaków</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1">Temat</label>
                <input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAIGenerate()}
                  placeholder="np. automatyzacja faktur, brak czasu na odpowiedzi, chatbot dla gabinetu..."
                  className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1">Typ</label>
                  <select
                    value={aiType}
                    onChange={(e) => setAiType(e.target.value as TemplateType)}
                    className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    {TEMPLATE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1">Kategoria</label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value as TemplateCategory)}
                    className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 block mb-1">Ile ({aiCount})</label>
                  <input
                    type="range"
                    min={3}
                    max={15}
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full accent-primary mt-2"
                  />
                </div>
              </div>

              <button
                onClick={handleAIGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating ? 'Generuję…' : `Generuj ${aiCount} szablonów`}
              </button>

              {/* Generated results */}
              {generated.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/50">
                      Zaznacz które chcesz dodać ({generated.filter((g) => g.selected).length}/{generated.length})
                    </p>
                    <button
                      onClick={selectAll}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Zaznacz wszystkie
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {generated.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => toggleSelect(i)}
                        className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          item.selected
                            ? 'border-primary/40 bg-primary/8'
                            : 'border-white/8 hover:border-white/20'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors ${
                            item.selected
                              ? 'bg-primary border-primary'
                              : 'border-white/25 bg-transparent'
                          }`}
                        >
                          {item.selected && <Check size={10} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/80 mb-0.5">{item.name}</p>
                          <p className="text-sm text-white/70 leading-relaxed">{item.text}</p>
                          {item.strength && (
                            <p className="text-[10px] text-white/30 mt-1 italic">{item.strength}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            Anuluj
          </button>
          {mode === 'manual' ? (
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Dodaj szablon
            </button>
          ) : (
            <button
              onClick={handleAISave}
              disabled={savingAI || generated.filter((g) => g.selected).length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {savingAI && <Loader2 size={13} className="animate-spin" />}
              Dodaj zaznaczone ({generated.filter((g) => g.selected).length})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Metrics Modal ─────────────────────────────────────────────────────────────

function MetricsModal({
  template,
  onClose,
  onSave,
}: {
  template: ContentTemplate
  onClose: () => void
  onSave: (likes: number, comments: number, reach: number) => Promise<void>
}) {
  const [likes, setLikes] = useState(template.perf_likes ?? 0)
  const [comments, setComments] = useState(template.perf_comments ?? 0)
  const [reach, setReach] = useState(template.perf_reach ?? 0)
  const [saving, setSaving] = useState(false)

  const previewScore = reach > 0
    ? Math.min(100, Math.round(((likes + comments * 3) / reach) * 1000))
    : 0

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(likes, comments, reach)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-white/10 rounded-2xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Metryki performance</h3>
            <p className="text-[11px] text-white/40 truncate mt-0.5">{template.name}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Likes / Reakcje', value: likes, setter: setLikes },
            { label: 'Komentarze', value: comments, setter: setComments },
            { label: 'Zasięg (reach)', value: reach, setter: setReach },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label className="text-xs text-white/50 block mb-1">{label}</label>
              <input
                type="number"
                min={0}
                value={value}
                onChange={(e) => setter(Number(e.target.value))}
                className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          ))}
        </div>

        {/* Score preview */}
        {reach > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-primary/8 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Performance Score</span>
              <span className="text-lg font-bold text-primary">{previewScore}/100</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${previewScore}%` }}
              />
            </div>
            <StarRating score={previewScore} />
            <p className="text-[10px] text-white/30 mt-1">
              Engagement: {reach > 0 ? (((likes + comments * 3) / reach) * 100).toFixed(2) : 0}%
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Zapisz metryki
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BankPage() {
  const router = useRouter()
  const { templates, loading, fetch, create, createMany, updateMetrics, incrementUsed, remove } =
    useTemplates()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TemplateType | 'all'>('all')
  const [catFilter, setCatFilter] = useState<TemplateCategory | 'all'>('all')
  const [sortMode, setSortMode] = useState<SortMode>('score')
  const [showAdd, setShowAdd] = useState(false)
  const [metricsTarget, setMetricsTarget] = useState<ContentTemplate | null>(null)

  useEffect(() => { fetch() }, [fetch])

  // ─── Filtered + sorted ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = templates.filter((t) => t.is_active !== false)

    if (typeFilter !== 'all') list = list.filter((t) => t.template_type === typeFilter)
    if (catFilter !== 'all') list = list.filter((t) => t.category === catFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q),
      )
    }

    return [...list].sort((a, b) => {
      if (sortMode === 'score') return (b.performance_score ?? 0) - (a.performance_score ?? 0)
      if (sortMode === 'used') return (b.times_used ?? 0) - (a.times_used ?? 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [templates, typeFilter, catFilter, search, sortMode])

  // ─── Stats ────────────────────────────────────────────────────────────────

  const totalUsed = templates.reduce((s, t) => s + (t.times_used ?? 0), 0)
  const withScore = templates.filter((t) => (t.performance_score ?? 0) > 0)
  const avgScore =
    withScore.length > 0
      ? Math.round(withScore.reduce((s, t) => s + (t.performance_score ?? 0), 0) / withScore.length)
      : 0
  const topTemplate = withScore.sort((a, b) => (b.performance_score ?? 0) - (a.performance_score ?? 0))[0]

  const handleUse = async (t: ContentTemplate) => {
    await navigator.clipboard.writeText(t.content)
    await incrementUsed(t.id, t.times_used ?? 0)
    toast.success('Skopiowano i zaktualizowano licznik')
    // Navigate to generator with template context
    router.push(
      `/content/generator?type=${t.template_type}&content=${encodeURIComponent(t.content.slice(0, 100))}`,
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć ten szablon?')) return
    await remove(id)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bank szablonów</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {templates.length} szablonów · {totalUsed} użyć łącznie
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          Dodaj szablon
        </button>
      </div>

      {/* Stats row */}
      {templates.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Szablonów', value: templates.length, color: '#6C5CE7' },
            { label: 'Śr. performance score', value: avgScore > 0 ? `${avgScore}/100` : '—', color: '#FDCB6E' },
            {
              label: 'Top szablon',
              value: topTemplate?.name?.slice(0, 20) ?? '—',
              color: '#00B894',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-4 py-3 rounded-xl bg-card border border-white/8">
              <p className="text-[11px] text-white/40">{label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Search + sort */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj szablonów…"
              className="w-full pl-9 pr-4 py-2 bg-card border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="appearance-none pl-8 pr-4 py-2 bg-card border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:ring-1 focus:ring-primary/40 pr-8"
            >
              <option value="score">Najlepsze</option>
              <option value="used">Najczęściej używane</option>
              <option value="newest">Najnowsze</option>
            </select>
            <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          </div>
        </div>

        {/* Type chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === 'all'
                ? 'bg-white/15 text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            Wszystkie typy
          </button>
          {TEMPLATE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(typeFilter === t.value ? 'all' : t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === t.value ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
              style={
                typeFilter === t.value
                  ? { background: `${t.color}25`, borderWidth: 1, borderStyle: 'solid', borderColor: `${t.color}50` }
                  : { background: 'rgba(255,255,255,0.04)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCatFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              catFilter === 'all'
                ? 'bg-white/10 text-white'
                : 'text-white/35 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            Wszystkie kategorie
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCatFilter(catFilter === c.value ? 'all' : c.value)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                catFilter === c.value
                  ? 'bg-secondary/20 text-secondary border border-secondary/30'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={20} className="animate-spin text-white/30" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-white/25 text-sm">
            {templates.length === 0
              ? 'Brak szablonów — dodaj pierwszy!'
              : 'Brak wyników dla wybranych filtrów'}
          </p>
          {templates.length === 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-white/15 text-white/50 hover:text-white hover:border-white/30 text-sm transition-colors"
            >
              <Plus size={14} />
              Dodaj pierwszy szablon
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-white/30">{filtered.length} szablonów</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onUse={handleUse}
                onMetrics={setMetricsTarget}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {showAdd && (
        <AddTemplateModal
          onClose={() => setShowAdd(false)}
          onCreate={create}
          onCreateMany={createMany}
        />
      )}
      {metricsTarget && (
        <MetricsModal
          template={metricsTarget}
          onClose={() => setMetricsTarget(null)}
          onSave={(l, c, r) => updateMetrics(metricsTarget.id, l, c, r)}
        />
      )}
    </div>
  )
}
