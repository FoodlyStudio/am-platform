'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { ContentItem, ContentChannel, ContentType, ContentStatus } from '@/types'
import { format } from 'date-fns'
import {
  X,
  Sparkles,
  Loader2,
  Lightbulb,
  Hash,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_OPTIONS: { value: ContentChannel; label: string; emoji: string }[] = [
  { value: 'instagram', label: 'Instagram', emoji: '📸' },
  { value: 'linkedin_personal', label: 'LinkedIn (osobisty)', emoji: '💼' },
  { value: 'linkedin_company', label: 'LinkedIn (firma)', emoji: '🏢' },
  { value: 'facebook', label: 'Facebook', emoji: '👥' },
  { value: 'newsletter', label: 'Newsletter', emoji: '📧' },
]

const TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'single_post', label: 'Post graficzny' },
  { value: 'carousel', label: 'Karuzela' },
  { value: 'reel_script', label: 'Skrypt Reels/TikTok' },
  { value: 'story', label: 'Story' },
  { value: 'linkedin_post', label: 'Post LinkedIn' },
  { value: 'article', label: 'Artykuł' },
  { value: 'newsletter', label: 'Newsletter' },
]

const STATUS_OPTIONS: { value: ContentStatus; label: string; color: string }[] = [
  { value: 'idea', label: 'Pomysł', color: '#636E72' },
  { value: 'draft', label: 'Draft', color: '#74B9FF' },
  { value: 'ready', label: 'Gotowy', color: '#FDCB6E' },
  { value: 'scheduled', label: 'Zaplanowany', color: '#6C5CE7' },
  { value: 'published', label: 'Opublikowany', color: '#00B894' },
]

const CHAR_LIMITS: Record<string, number> = {
  instagram: 2200,
  linkedin_company: 3000,
  linkedin_personal: 3000,
  facebook: 5000,
  newsletter: 10000,
}

const HOOK_BANK = [
  'Popełniłem błąd, który kosztował mnie 10 000 PLN. Oto czego mnie nauczył:',
  'Nikt Ci nie powie, że Twoja strona traci klientów z jednego powodu:',
  'Mój klient zarobił dodatkowe 50 000 PLN w 3 miesiące. Oto jak:',
  '3 rzeczy, których żałuję z pierwszych lat prowadzenia biznesu:',
  'Wysyłasz faktury ręcznie? Tracisz 5 godzin miesięcznie. Oto dlaczego:',
  'ChatGPT nie zastąpi Twojego marketingu. Ale to narzędzie zastąpi:',
  'Zrobiłem analizę 47 stron małych firm. Wyniki mnie zaskoczyły:',
  'Jeden prosty chatbot = 3 więcej zapytań dziennie. Sprawdzone:',
  'Twoja konkurencja już to robi. Ty jeszcze nie:',
  'W 2025 r. albo automatyzujesz, albo zostajesz w tyle. Od czego zacząć:',
  'Recepcjonistka vs. chatbot AI. Wynik Cię zaskoczy:',
  '5 narzędzi, które używam każdego dnia (płacę za 2):',
  'Klient zapytał o cenę strony. Moja odpowiedź go zaskoczyła:',
  'Dlaczego Twoja strona www nie sprzedaje (i jak to naprawić dziś):',
  'Przed: 2 godziny dziennie na maile. Po automatyzacji: 15 minut.',
]

// ─── Hashtag Input ────────────────────────────────────────────────────────────

function HashtagInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [input, setInput] = useState('')

  const addTag = (val: string) => {
    const clean = val.replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '')
    if (clean && !tags.includes(clean)) onChange([...tags, clean])
    setInput('')
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-dark border border-white/10 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 min-h-[42px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs"
        >
          <Hash size={9} />
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="hover:text-white ml-0.5"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? 'Dodaj hashtag (Enter)' : ''}
        className="flex-1 min-w-[100px] bg-transparent text-sm text-white outline-none placeholder:text-white/25"
      />
    </div>
  )
}

// ─── Hook Bank Popover ────────────────────────────────────────────────────────

function HookBank({ onSelect }: { onSelect: (hook: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary transition-colors"
      >
        <Lightbulb size={11} />
        Bank hooków
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-card border border-white/15 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
          {HOOK_BANK.map((hook, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(hook)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/8 transition-colors border-b border-white/5 last:border-0"
            >
              {hook}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  right,
}: {
  label: string
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-white/60">{label}</label>
        {right}
      </div>
      {children}
    </div>
  )
}

function Input({
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
      className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
    />
  )
}

function NativeSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; emoji?: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 appearance-none transition-all"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.emoji ? `${o.emoji} ${o.label}` : o.label}
        </option>
      ))}
    </select>
  )
}

// ─── Modal Types ──────────────────────────────────────────────────────────────

type FormData = {
  channel: ContentChannel
  content_type: ContentType
  scheduled_date: string
  scheduled_time: string
  title: string
  content_body: string
  hook: string
  cta: string
  hashtags: string[]
  status: ContentStatus
}

interface PostModalProps {
  open: boolean
  onClose: () => void
  initialDate?: Date
  item?: ContentItem | null
  onSave: (data: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function PostModal({ open, onClose, initialDate, item, onSave, onDelete }: PostModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const defaultForm = (): FormData => ({
    channel: 'instagram',
    content_type: 'single_post',
    scheduled_date: initialDate ? format(initialDate, 'yyyy-MM-dd') : '',
    scheduled_time: '09:00',
    title: '',
    content_body: '',
    hook: '',
    cta: '',
    hashtags: [],
    status: 'idea',
  })

  const [form, setForm] = useState<FormData>(defaultForm)

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return
    if (item) {
      setForm({
        channel: item.channel ?? 'instagram',
        content_type: item.content_type ?? 'single_post',
        scheduled_date: item.scheduled_date ?? '',
        scheduled_time: item.scheduled_time ?? '09:00',
        title: item.title ?? '',
        content_body: item.content_body ?? '',
        hook: item.hook ?? '',
        cta: item.cta ?? '',
        hashtags: item.hashtags ?? [],
        status: item.status ?? 'idea',
      })
    } else {
      setForm(defaultForm())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  useEffect(() => {
    const handler = (e: Event) => (e as globalThis.KeyboardEvent).key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const charLimit = CHAR_LIMITS[form.channel] ?? 3000
  const charCount = form.content_body.length

  const handleGenerate = async () => {
    if (!form.title && !form.hook) {
      toast.error('Podaj tytuł lub hook przed generowaniem')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: form.channel,
          content_type: form.content_type,
          title: form.title,
          hook: form.hook,
        }),
      })
      const { result } = await res.json()
      if (result) {
        setForm((f) => ({
          ...f,
          title: result.title || f.title,
          content_body: result.content_body || f.content_body,
          hook: result.hook || f.hook,
          cta: result.cta || f.cta,
          hashtags: result.hashtags?.length ? result.hashtags : f.hashtags,
        }))
        toast.success('Treść wygenerowana')
      }
    } catch {
      toast.error('Błąd generowania')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Podaj tytuł posta')
      return
    }
    setSaving(true)
    try {
      await onSave({
        channel: form.channel,
        content_type: form.content_type,
        scheduled_date: form.scheduled_date || undefined,
        scheduled_time: form.scheduled_time || undefined,
        title: form.title,
        content_body: form.content_body || undefined,
        hook: form.hook || undefined,
        cta: form.cta || undefined,
        hashtags: form.hashtags.length ? form.hashtags : undefined,
        status: form.status,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item || !onDelete) return
    setDeleting(true)
    try {
      await onDelete(item.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="w-full max-w-2xl bg-card border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">
            {item ? 'Edytuj post' : 'Nowy post'}
          </h2>
          <div className="flex items-center gap-2">
            {item && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg text-accent/70 hover:text-accent hover:bg-accent/10 transition-colors"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Row 1: channel + type */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kanał">
              <NativeSelect
                value={form.channel}
                onChange={(v) => set('channel', v)}
                options={CHANNEL_OPTIONS}
              />
            </Field>
            <Field label="Typ treści">
              <NativeSelect
                value={form.content_type}
                onChange={(v) => set('content_type', v)}
                options={TYPE_OPTIONS}
              />
            </Field>
          </div>

          {/* Row 2: date + time + status */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Data publikacji">
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(v) => set('scheduled_date', v)}
              />
            </Field>
            <Field label="Godzina">
              <Input
                type="time"
                value={form.scheduled_time}
                onChange={(v) => set('scheduled_time', v)}
              />
            </Field>
            <Field label="Status">
              <div className="relative">
                <NativeSelect
                  value={form.status}
                  onChange={(v) => set('status', v)}
                  options={STATUS_OPTIONS}
                />
                <span
                  className="absolute right-8 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                  style={{
                    background:
                      STATUS_OPTIONS.find((s) => s.value === form.status)?.color ?? '#636E72',
                  }}
                />
              </div>
            </Field>
          </div>

          {/* Title */}
          <Field label="Tytuł / Temat">
            <Input
              value={form.title}
              onChange={(v) => set('title', v)}
              placeholder="Krótki opis tematu posta..."
            />
          </Field>

          {/* Hook */}
          <Field
            label="Hook (pierwsze zdanie)"
            right={<HookBank onSelect={(h) => set('hook', h)} />}
          >
            <textarea
              value={form.hook}
              onChange={(e) => set('hook', e.target.value)}
              placeholder="Mocne pierwsze zdanie, które zatrzyma przewijanie..."
              rows={2}
              className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
            />
          </Field>

          {/* Content body */}
          <Field
            label="Treść posta"
            right={
              <span
                className={`text-[11px] font-mono ${
                  charCount > charLimit ? 'text-accent' : 'text-white/30'
                }`}
              >
                {charCount}/{charLimit}
              </span>
            }
          >
            <textarea
              value={form.content_body}
              onChange={(e) => set('content_body', e.target.value)}
              placeholder="Pełna treść posta gotowa do publikacji..."
              rows={7}
              maxLength={charLimit + 500}
              className="w-full rounded-lg bg-dark border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
            />
          </Field>

          {/* CTA */}
          <Field label="CTA (wezwanie do działania)">
            <Input
              value={form.cta}
              onChange={(v) => set('cta', v)}
              placeholder="Napisz w komentarzu, zadzwoń, umów bezpłatną konsultację..."
            />
          </Field>

          {/* Hashtags */}
          <Field label="Hashtagi">
            <HashtagInput tags={form.hashtags} onChange={(tags) => set('hashtags', tags)} />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Generuj z AI
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {item ? 'Zapisz zmiany' : 'Dodaj post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
