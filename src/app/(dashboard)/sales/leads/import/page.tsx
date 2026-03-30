'use client'

import { useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/client'
import { LEAD_SEGMENTS } from '@/lib/constants'
import type { LeadSegment } from '@/types'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Users,
  ArrowLeft,
  Info,
  RotateCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────────────────

type CsvRow = Record<string, string>
type Step = 'upload' | 'mapping' | 'settings' | 'importing' | 'done'

type TargetField =
  | 'first_name'
  | 'last_name'
  | 'company'
  | 'position'
  | 'email'
  | 'linkedin_url'
  | 'company_website'
  | 'buying_signal'

const TARGET_FIELDS: { key: TargetField; label: string; required: boolean; hint: string }[] = [
  { key: 'first_name',       label: 'Imię',              required: true,  hint: 'First Name, Imię' },
  { key: 'last_name',        label: 'Nazwisko',           required: true,  hint: 'Last Name, Nazwisko' },
  { key: 'company',          label: 'Firma',              required: true,  hint: 'Company, Company Name' },
  { key: 'position',         label: 'Stanowisko',         required: false, hint: 'Title, Position, Job Title' },
  { key: 'email',            label: 'Email',              required: false, hint: 'Email, Email Address' },
  { key: 'linkedin_url',     label: 'LinkedIn URL',       required: false, hint: 'LinkedIn Profile URL' },
  { key: 'company_website',  label: 'Strona firmy',       required: false, hint: 'Website, Company Website' },
  { key: 'buying_signal',    label: 'Sygnał zakupowy',    required: false, hint: 'Buying Signal, Notes' },
]

// ─── Auto-detect synonyms ────────────────────────────────────────────────────

const FIELD_SYNONYMS: Record<TargetField, string[]> = {
  first_name:       ['first name', 'firstname', 'first_name', 'imię', 'imie', 'name'],
  last_name:        ['last name', 'lastname', 'last_name', 'nazwisko', 'surname'],
  company:          ['company', 'company name', 'company_name', 'firm', 'firma', 'organization', 'organization name', 'employer'],
  position:         ['position', 'title', 'job title', 'job_title', 'stanowisko', 'role', 'current job title'],
  email:            ['email', 'email address', 'email_address', 'e-mail', 'work email', 'person email'],
  linkedin_url:     ['linkedin', 'linkedin url', 'linkedin profile url', 'person linkedin url', 'linkedin_url', 'profile url', 'linkedin profile', 'url'],
  company_website:  ['website', 'company website', 'company_website', 'website url', 'strona', 'company domain', 'domain'],
  buying_signal:    ['buying signal', 'buying_signal', 'notes', 'sygnał', 'sygnal', 'signal', 'note', 'uwagi'],
}

function autoDetect(headers: string[]): Partial<Record<TargetField, string>> {
  const mapping: Partial<Record<TargetField, string>> = {}
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())

  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS) as [TargetField, string[]][]) {
    const idx = normalizedHeaders.findIndex((h) =>
      synonyms.some((s) => h === s || h.includes(s)),
    )
    if (idx !== -1) mapping[field] = headers[idx]
  }

  return mapping
}

// ─── Result types ─────────────────────────────────────────────────────────────

interface ImportResult {
  name: string
  company: string
  status: 'success' | 'error' | 'scoring' | 'qualified' | 'disqualified'
  score?: number
  message?: string
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'upload',    label: 'Upload' },
    { id: 'mapping',   label: 'Mapowanie' },
    { id: 'settings',  label: 'Ustawienia' },
    { id: 'importing', label: 'Import' },
    { id: 'done',      label: 'Gotowe' },
  ]
  const currentIdx = steps.findIndex((s) => s.id === current)

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => {
        const done    = i < currentIdx
        const active  = i === currentIdx
        const future  = i > currentIdx
        return (
          <div key={step.id} className="flex items-center">
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12px] font-medium
              ${active ? 'bg-primary/15 text-primary' : done ? 'text-secondary' : 'text-white/25'}
            `}>
              {done ? (
                <CheckCircle2 size={13} />
              ) : (
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px]
                  ${active ? 'border-primary text-primary bg-primary/10' : 'border-white/15 text-white/20'}
                `}>
                  {i + 1}
                </span>
              )}
              <span className={future ? 'hidden sm:block' : ''}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={13} className="text-white/15 mx-0.5" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
    score >= 6 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
    score >= 5 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                 'bg-red-500/20 text-red-400 border-red-500/30'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${color}`}>
      {score}/10
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [step, setStep]               = useState<Step>('upload')
  const [rows, setRows]               = useState<CsvRow[]>([])
  const [headers, setHeaders]         = useState<string[]>([])
  const [mapping, setMapping]         = useState<Partial<Record<TargetField, string>>>({})
  const [segment, setSegment]         = useState<LeadSegment>('budowlanka')
  const [aiEnabled, setAiEnabled]     = useState(true)
  const [minScore, setMinScore]       = useState(5)
  const [isDragging, setIsDragging]   = useState(false)
  const [fileName, setFileName]       = useState('')

  // Import progress
  const [progress, setProgress]       = useState(0)
  const [results, setResults]         = useState<ImportResult[]>([])
  const [, setImporting]              = useState(false)
  const resultsEndRef                 = useRef<HTMLDivElement>(null)

  // Summary
  const [summary, setSummary]         = useState({ total: 0, qualified: 0, disqualified: 0, errors: 0 })

  // ── Parse CSV ──
  const parseFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Prześlij plik .CSV')
      return
    }
    setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data as CsvRow[]
        if (!rows.length) { toast.error('Plik jest pusty'); return }
        const hdrs = Object.keys(rows[0])
        setRows(rows)
        setHeaders(hdrs)
        setMapping(autoDetect(hdrs))
        setStep('mapping')
      },
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  // ── Validate mapping ──
  const missingRequired = TARGET_FIELDS
    .filter((f) => f.required && !mapping[f.key])
    .map((f) => f.label)

  // ── Get mapped value from row ──
  const getMapped = (row: CsvRow, field: TargetField): string =>
    mapping[field] ? (row[mapping[field]!] ?? '').trim() : ''

  // ── Run import ──
  const runImport = async () => {
    setImporting(true)
    setStep('importing')
    setResults([])
    setProgress(0)

    const supabase = createClient()
    let qualified = 0, disqualified = 0, errors = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const firstName = getMapped(row, 'first_name')
      const lastName  = getMapped(row, 'last_name')
      const company   = getMapped(row, 'company')
      const name      = `${firstName} ${lastName}`.trim() || company

      // Add placeholder result while processing
      setResults((prev) => [
        ...prev,
        { name, company, status: 'scoring' },
      ])

      // 1. Insert lead
      const { data: lead, error: insertErr } = await supabase
        .from('leads')
        .insert({
          first_name:      firstName || 'Nieznane',
          last_name:       lastName  || '',
          company:         company   || 'Nieznana firma',
          position:        getMapped(row, 'position')         || null,
          email:           getMapped(row, 'email')            || null,
          linkedin_url:    getMapped(row, 'linkedin_url')     || null,
          company_website: getMapped(row, 'company_website')  || null,
          buying_signal:   getMapped(row, 'buying_signal')    || null,
          segment,
          source:          'csv_import',
          status:          'new',
          priority:        'standard',
        })
        .select('id')
        .single()

      if (insertErr || !lead) {
        errors++
        setResults((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { name, company, status: 'error', message: insertErr?.message }
          return copy
        })
        setProgress(Math.round(((i + 1) / rows.length) * 100))
        continue
      }

      // 2. AI scoring
      if (aiEnabled) {
        try {
          const res = await fetch('/api/ai/score-lead', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ leadId: lead.id, minScore }),
          })
          const data = await res.json()

          if (data.ok) {
            const isQualified = data.qualified as boolean
            isQualified ? qualified++ : disqualified++
            setResults((prev) => {
              const copy = [...prev]
              copy[copy.length - 1] = {
                name,
                company,
                status: isQualified ? 'qualified' : 'disqualified',
                score: data.score,
              }
              return copy
            })
          } else {
            errors++
            setResults((prev) => {
              const copy = [...prev]
              copy[copy.length - 1] = { name, company, status: 'success', message: 'Scoring nieudany' }
              return copy
            })
          }
        } catch {
          errors++
          setResults((prev) => {
            const copy = [...prev]
            copy[copy.length - 1] = { name, company, status: 'success' }
            return copy
          })
        }
      } else {
        qualified++
        setResults((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { name, company, status: 'success' }
          return copy
        })
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100))
      resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    setSummary({ total: rows.length, qualified, disqualified, errors })
    setImporting(false)
    setStep('done')
  }

  const reset = () => {
    setStep('upload')
    setRows([])
    setHeaders([])
    setMapping({})
    setResults([])
    setProgress(0)
    setFileName('')
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="p-1.5 rounded-[8px] text-white/40 hover:text-white hover:bg-white/5 transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Import leadów z CSV</h1>
          <p className="text-sm text-white/45 mt-0.5">Sales Navigator / Evaboot export</p>
        </div>
      </div>

      <StepIndicator current={step} />

      {/* ─── STEP 1: UPLOAD ─── */}
      {step === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => document.getElementById('csv-file-input')?.click()}
          className={`
            border-2 border-dashed rounded-[16px] p-14 text-center cursor-pointer transition-all
            ${isDragging
              ? 'border-primary bg-primary/8 scale-[1.01]'
              : 'border-white/10 hover:border-primary/40 hover:bg-primary/4'}
          `}
        >
          <div className={`
            w-14 h-14 rounded-[14px] mx-auto mb-4 flex items-center justify-center
            ${isDragging ? 'bg-primary/20' : 'bg-white/5'}
          `}>
            <FileSpreadsheet size={28} className={isDragging ? 'text-primary' : 'text-white/30'} />
          </div>
          <p className="text-[15px] font-semibold text-white/80 mb-1">
            {isDragging ? 'Upuść plik tutaj' : 'Przeciągnij plik CSV lub kliknij'}
          </p>
          <p className="text-sm text-white/35">
            Export z Sales Navigator lub Evaboot · maks. 5000 wierszy
          </p>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
          />
        </div>
      )}

      {/* ─── STEP 2: MAPOWANIE ─── */}
      {step === 'mapping' && (
        <div className="space-y-5">
          {/* File info */}
          <div className="flex items-center gap-3 p-3.5 bg-card rounded-[12px] border border-white/8">
            <FileSpreadsheet size={18} className="text-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{fileName}</p>
              <p className="text-xs text-white/40">{rows.length} wierszy · {headers.length} kolumn</p>
            </div>
            <button onClick={reset} className="text-xs text-white/35 hover:text-white/60 flex items-center gap-1 transition-colors">
              <RotateCcw size={12} />
              Zmień plik
            </button>
          </div>

          {/* Mapping table */}
          <div className="bg-card rounded-[14px] border border-white/8 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Mapowanie kolumn</p>
              <div className="flex items-center gap-1.5 text-[11px] text-white/35">
                <Info size={11} />
                Auto-wykryto {Object.values(mapping).filter(Boolean).length}/{TARGET_FIELDS.length} pól
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {TARGET_FIELDS.map((field) => {
                const detected = mapping[field.key]
                return (
                  <div key={field.key} className="flex items-center gap-4 px-5 py-3">
                    {/* Target field name */}
                    <div className="w-36 flex-shrink-0">
                      <span className="text-[13px] font-medium text-white/80">{field.label}</span>
                      {field.required && (
                        <span className="ml-1.5 text-accent text-[10px]">*</span>
                      )}
                      <p className="text-[10px] text-white/30 mt-0.5">{field.hint}</p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight size={14} className="text-white/15 flex-shrink-0" />

                    {/* Column select */}
                    <div className="flex-1">
                      <select
                        value={mapping[field.key] ?? ''}
                        onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value || undefined }))}
                        className={`
                          w-full rounded-[8px] border px-3 py-1.5 text-[13px]
                          bg-[#0F0F1A] focus:outline-none focus:ring-2 focus:ring-primary/40
                          transition-all
                          ${detected
                            ? 'border-secondary/40 text-white'
                            : 'border-white/10 text-white/50'}
                        `}
                      >
                        <option value="">— Pomiń pole —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status icon */}
                    <div className="w-5 flex-shrink-0">
                      {detected ? (
                        <CheckCircle2 size={15} className="text-secondary" />
                      ) : field.required ? (
                        <AlertCircle size={15} className="text-accent" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-white/10 mx-auto" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Validation errors */}
          {missingRequired.length > 0 && (
            <div className="flex items-start gap-2.5 p-3.5 bg-accent/8 border border-accent/25 rounded-[10px]">
              <AlertCircle size={15} className="text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-accent/90">
                Wymagane pola bez mapowania: <strong>{missingRequired.join(', ')}</strong>
              </p>
            </div>
          )}

          {/* Preview */}
          <div className="bg-card rounded-[14px] border border-white/8 overflow-hidden">
            <p className="px-5 py-3 text-[12px] font-semibold text-white/40 uppercase tracking-wide border-b border-white/6">
              Podgląd (pierwsze 10 wierszy)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/6">
                    {TARGET_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                      <th key={f.key} className="text-left px-4 py-2.5 text-white/35 font-medium whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      {TARGET_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <td key={f.key} className="px-4 py-2 text-white/65 max-w-[160px] truncate">
                          {getMapped(row, f.key) || <span className="text-white/20">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <p className="px-4 py-2 text-[11px] text-white/25">+{rows.length - 10} więcej wierszy</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep('settings')}
              disabled={missingRequired.length > 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-[8px] transition-all"
            >
              Dalej — Ustawienia
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: SETTINGS ─── */}
      {step === 'settings' && (
        <div className="space-y-5">
          {/* Segment */}
          <div className="bg-card rounded-[14px] border border-white/8 p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-white mb-1">Segment klientów</p>
              <p className="text-xs text-white/40">Wszystkie leady z tej partii zostaną przypisane do wybranego segmentu</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {LEAD_SEGMENTS.map((seg) => (
                <button
                  key={seg.value}
                  onClick={() => setSegment(seg.value)}
                  className={`
                    px-3 py-2.5 rounded-[10px] text-left text-[12px] font-medium border transition-all
                    ${segment === seg.value
                      ? 'bg-primary/15 border-primary/50 text-primary'
                      : 'bg-[#0F0F1A] border-white/8 text-white/55 hover:text-white/80 hover:border-white/15'}
                  `}
                >
                  <span className="block truncate">{seg.label}</span>
                  <span className="block text-[10px] mt-0.5 text-white/30 font-normal truncate">{seg.industry}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Scoring */}
          <div className="bg-card rounded-[14px] border border-white/8 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={15} className="text-primary" />
                  <p className="text-sm font-semibold text-white">AI Scoring (GPT-4o mini)</p>
                </div>
                <p className="text-xs text-white/40">
                  Dla każdego leada: analiza profilu + strony firmy → score 1-10, problem, icebreaker, segment.
                  Automatycznie tworzy deal dla zakwalifikowanych.
                </p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => setAiEnabled((v) => !v)}
                className={`
                  relative w-10 h-5.5 rounded-full flex-shrink-0 mt-0.5 transition-colors duration-200
                  ${aiEnabled ? 'bg-primary' : 'bg-white/15'}
                `}
                style={{ height: '22px', width: '42px' }}
              >
                <span className={`
                  absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200
                  ${aiEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}
                `} />
              </button>
            </div>

            {aiEnabled && (
              <>
                <div className="h-px bg-white/6" />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[13px] font-medium text-white/70">
                      Minimalny score do zakwalifikowania
                    </label>
                    <div className={`
                      px-3 py-1 rounded-full text-sm font-bold
                      ${minScore >= 7 ? 'bg-green-500/15 text-green-400' :
                        minScore >= 5 ? 'bg-yellow-500/15 text-yellow-400' :
                                        'bg-red-500/15 text-red-400'}
                    `}>
                      {minScore}/10
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-white/25 mt-1">
                    <span>1 — wszystko</span>
                    <span>5 — rekomendowane</span>
                    <span>10 — idealni</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/15 rounded-[10px]">
                  <Info size={13} className="text-primary/70 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-white/50">
                    Przy {rows.length} leadach i ok. 2s/lead: ~{Math.round(rows.length * 2 / 60)} min.
                    Leady ze score &lt; {minScore} zostaną zdyskwalifikowane (nie tworzy deala).
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Summary before import */}
          <div className="flex items-center gap-3 p-4 bg-card rounded-[12px] border border-white/8">
            <Users size={18} className="text-secondary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">{rows.length} leadów gotowych do importu</p>
              <p className="text-xs text-white/40">
                Segment: {LEAD_SEGMENTS.find((s) => s.value === segment)?.label} ·{' '}
                AI scoring: {aiEnabled ? `wł. (min score ${minScore})` : 'wył.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('mapping')}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft size={14} />
              Wróć
            </button>
            <button
              onClick={runImport}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-[8px] transition-all shadow-lg shadow-primary/25"
            >
              <Upload size={15} />
              Importuj {rows.length} leadów
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: IMPORTING ─── */}
      {step === 'importing' && (
        <div className="space-y-5">
          {/* Progress bar */}
          <div className="bg-card rounded-[14px] border border-white/8 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">
                Przetwarzanie leadów...
              </p>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-white/35 mt-2">
              {results.length} / {rows.length} leadów  {aiEnabled && '· Scoring AI włączony'}
            </p>
          </div>

          {/* Live results */}
          <div className="bg-card rounded-[14px] border border-white/8 overflow-hidden">
            <p className="px-5 py-3 text-[12px] font-semibold text-white/40 uppercase tracking-wide border-b border-white/6">
              Live log
            </p>
            <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm
                    ${r.status === 'qualified'    ? 'bg-green-500/8 border border-green-500/15' :
                      r.status === 'disqualified' ? 'bg-red-500/5 border border-red-500/10' :
                      r.status === 'error'        ? 'bg-red-500/8 border border-red-500/20' :
                      r.status === 'scoring'      ? 'bg-primary/5 border border-primary/10 animate-pulse' :
                                                    'bg-white/[0.03] border border-white/5'}
                  `}
                >
                  {r.status === 'qualified'    && <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />}
                  {r.status === 'disqualified' && <XCircle      size={14} className="text-red-400/70 flex-shrink-0" />}
                  {r.status === 'error'        && <AlertCircle  size={14} className="text-accent flex-shrink-0" />}
                  {r.status === 'scoring'      && (
                    <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  )}
                  {r.status === 'success'      && <CheckCircle2 size={14} className="text-secondary flex-shrink-0" />}

                  <span className={`flex-1 font-medium truncate ${
                    r.status === 'qualified'    ? 'text-green-300' :
                    r.status === 'disqualified' ? 'text-white/45' :
                    r.status === 'error'        ? 'text-accent' :
                    r.status === 'scoring'      ? 'text-primary/80' : 'text-white/70'
                  }`}>
                    {r.name}
                  </span>

                  <span className="text-white/30 text-xs truncate hidden sm:block">{r.company}</span>

                  {r.score !== undefined && <ScoreBadge score={r.score} />}

                  {r.status === 'scoring' && (
                    <span className="text-[11px] text-primary/60">scoring...</span>
                  )}
                  {r.status === 'error' && r.message && (
                    <span className="text-[11px] text-accent/70 truncate hidden sm:block">{r.message}</span>
                  )}
                </div>
              ))}
              <div ref={resultsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 5: DONE ─── */}
      {step === 'done' && (
        <div className="space-y-5">
          {/* Big summary */}
          <div className="bg-card rounded-[16px] border border-secondary/20 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-[12px] bg-secondary/20 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-secondary" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Import zakończony!</p>
                <p className="text-sm text-white/45">Wyniki scoringu dla partii {fileName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Zaimportowano',    value: summary.total,        color: 'text-white',        bg: 'bg-white/5' },
                { label: 'Zakwalifikowani',  value: summary.qualified,    color: 'text-green-400',    bg: 'bg-green-500/10' },
                { label: 'Zdyskwalifikowani',value: summary.disqualified, color: 'text-white/50',     bg: 'bg-white/[0.04]' },
                { label: 'Błędy',            value: summary.errors,       color: 'text-accent',       bg: 'bg-accent/10' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-[12px] p-4 ${stat.bg}`}>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
            {aiEnabled && summary.qualified > 0 && (
              <div className="mt-4 p-3 bg-primary/8 border border-primary/20 rounded-[10px]">
                <p className="text-[13px] text-white/70">
                  <Sparkles size={12} className="inline text-primary mr-1.5" />
                  Automatycznie utworzono <strong className="text-primary">{summary.qualified} dealów</strong> w pipeline na etapie <em>Nowy lead</em>
                </p>
              </div>
            )}
          </div>

          {/* Full results log */}
          <div className="bg-card rounded-[14px] border border-white/8 overflow-hidden">
            <p className="px-5 py-3 text-[12px] font-semibold text-white/40 uppercase tracking-wide border-b border-white/6">
              Pełny log ({results.length} leadów)
            </p>
            <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm
                    ${r.status === 'qualified'    ? 'bg-green-500/8 border border-green-500/15' :
                      r.status === 'disqualified' ? 'bg-white/[0.02] border border-white/5' :
                      r.status === 'error'        ? 'bg-accent/8 border border-accent/20' :
                                                    'bg-white/[0.03] border border-white/5'}
                  `}
                >
                  {r.status === 'qualified'    && <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />}
                  {r.status === 'disqualified' && <XCircle      size={14} className="text-white/25 flex-shrink-0" />}
                  {r.status === 'error'        && <AlertCircle  size={14} className="text-accent flex-shrink-0" />}
                  {r.status === 'success'      && <CheckCircle2 size={14} className="text-secondary flex-shrink-0" />}

                  <span className={`font-medium flex-1 truncate ${r.status === 'disqualified' ? 'text-white/35' : 'text-white/75'}`}>
                    {r.name}
                  </span>
                  <span className="text-white/25 text-xs truncate hidden sm:block">{r.company}</span>
                  {r.score !== undefined && <ScoreBadge score={r.score} />}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="/sales/leads"
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-[8px] transition-all"
            >
              <Users size={15} />
              Przejdź do Leadów
            </a>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-5 py-2.5 border border-white/15 text-white/60 hover:text-white hover:border-white/25 text-sm font-medium rounded-[8px] transition-all"
            >
              <RotateCcw size={14} />
              Importuj kolejny plik
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
