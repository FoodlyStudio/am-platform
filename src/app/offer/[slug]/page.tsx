'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { addDays, addWeeks, format } from 'date-fns'
import { pl } from 'date-fns/locale'

// Public supabase client (anon)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingVariant {
  name: string
  price: number
  features: string[]
  is_recommended: boolean
  ai_match_reason?: string
}

interface TimelineItem {
  week: string
  name: string
  description?: string
}

interface ScopeItem {
  text: string
  included: boolean
}

interface OfferPage {
  id: string
  deal_id: string
  public_slug: string
  company_name: string
  project_type?: string
  solution_description?: string
  daily_loss_amount?: number
  monthly_loss_amount?: number
  yearly_loss_amount?: number
  roi_months?: number
  pricing_variants: PricingVariant[]
  timeline_items: TimelineItem[]
  scope_items: ScopeItem[]
  start_date?: string
  payment_terms?: string
  expires_at?: string
  accepted_at?: string
  view_count?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('pl-PL') + ' PLN'
}

function useIntersection(ref: React.RefObject<Element | null>, onVisible: () => void) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible() },
      { threshold: 0.2 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref, onVisible])
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function OfferPublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const [offer, setOffer] = useState<OfferPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<PricingVariant | null>(null)
  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [acceptedStartDate, setAcceptedStartDate] = useState('')
  const sessionRef = useRef<string>(Math.random().toString(36).slice(2))
  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // ── Load offer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return
    const load = async () => {
      const { data, error } = await supabase
        .from('offer_pages')
        .select('*')
        .eq('public_slug', slug)
        .eq('is_active', true)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }
      setOffer(data)
      if (data.accepted_at) setAccepted(true)
      const recommended = data.pricing_variants?.find((v: PricingVariant) => v.is_recommended)
        ?? data.pricing_variants?.[0]
      setSelectedVariant(recommended ?? null)
      setLoading(false)

      // Track: view
      track('view', { variant: recommended?.name })
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // ── Time tracking ──────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const seconds = Math.round((Date.now() - startTimeRef.current) / 1000)
      track('time', { seconds })
    }, 30000)
    return () => clearInterval(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const track = useCallback((event_type: string, data?: Record<string, unknown>) => {
    if (!slug) return
    fetch('/api/offers/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, event_type, data }),
    }).catch(() => null)
  }, [slug])

  // ── Section tracking ───────────────────────────────────────────────────────
  const trackSection = useCallback((name: string) => {
    track('section', { section: name })
  }, [track])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 size={28} className="animate-spin text-[#6C5CE7]" />
    </div>
  )

  if (notFound || !offer) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-4">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Oferta nie znaleziona</h1>
      <p className="text-gray-500">Link może być nieaktywny lub oferta wygasła.</p>
    </div>
  )

  if (accepted) return (
    <ThankYouPage offer={offer} startDate={acceptedStartDate} variant={selectedVariant} />
  )

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Hero */}
      <HeroSection offer={offer} onVisible={() => {}} />

      {/* Loss Calculator */}
      {(offer.daily_loss_amount ?? 0) > 0 && (
        <LossSection offer={offer} onVisible={() => trackSection('loss')} />
      )}

      {/* Solution */}
      <SolutionSection offer={offer} onVisible={() => trackSection('solution')} />

      {/* Timeline */}
      {(offer.timeline_items?.length ?? 0) > 0 && (
        <TimelineSection offer={offer} onVisible={() => trackSection('timeline')} />
      )}

      {/* Pricing */}
      {(offer.pricing_variants?.length ?? 0) > 0 && (
        <PricingSection
          offer={offer}
          selected={selectedVariant}
          onSelect={(v) => {
            setSelectedVariant(v)
            track('slider', { variant: v.name })
            trackSection('pricing')
          }}
          onAccept={() => setAcceptModalOpen(true)}
        />
      )}

      {/* Accept Modal */}
      {acceptModalOpen && selectedVariant && (
        <AcceptModal
          offer={offer}
          variant={selectedVariant}
          onClose={() => setAcceptModalOpen(false)}
          onConfirm={(startDate) => {
            setAccepted(true)
            setAcceptedStartDate(startDate)
            setAcceptModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection({ offer, onVisible }: { offer: OfferPage; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useIntersection(ref, onVisible)

  const today = format(new Date(), 'd MMMM yyyy', { locale: pl })
  const expires = offer.expires_at
    ? format(new Date(offer.expires_at), 'd MMMM yyyy', { locale: pl })
    : null

  return (
    <section
      ref={ref}
      className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20 bg-gradient-to-br from-[#6C5CE7]/5 via-white to-white"
    >
      <FadeIn delay={0}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-pulse" />
          Przygotowane przez AM Automations
        </div>
      </FadeIn>

      <FadeIn delay={100}>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 leading-tight">
          Oferta dla<br />
          <span className="text-[#6C5CE7]">{offer.company_name}</span>
        </h1>
      </FadeIn>

      <FadeIn delay={200}>
        <p className="text-gray-500 text-lg mb-6">{today}</p>
      </FadeIn>

      {expires && (
        <FadeIn delay={300}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium">
            ⏳ Ważna do {expires}
          </div>
        </FadeIn>
      )}

      <FadeIn delay={400}>
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <a
            href="#pricing"
            className="px-8 py-4 rounded-2xl bg-[#6C5CE7] text-white font-bold text-lg hover:bg-[#5849c4] transition-colors shadow-lg shadow-[#6C5CE7]/30"
          >
            Zobacz ofertę
          </a>
          <a href="#loss" className="px-8 py-4 rounded-2xl border border-gray-200 text-gray-600 font-medium text-lg hover:border-[#6C5CE7] transition-colors">
            Ile tracę bez działania?
          </a>
        </div>
      </FadeIn>
    </section>
  )
}

// ─── Loss Calculator Section ──────────────────────────────────────────────────

function LossSection({ offer, onVisible }: { offer: OfferPage; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [elapsed, setElapsed] = useState(0)
  const [visible, setVisibleState] = useState(false)
  const startRef = useRef<number | null>(null)

  useIntersection(ref, () => {
    onVisible()
    setVisibleState(true)
    startRef.current = Date.now()
  })

  useEffect(() => {
    if (!visible) return
    const t = setInterval(() => {
      if (startRef.current) setElapsed((Date.now() - startRef.current) / 1000)
    }, 100)
    return () => clearInterval(t)
  }, [visible])

  const dailyLoss = offer.daily_loss_amount ?? 0
  const lossNow = (dailyLoss / 86400) * elapsed

  // Chart data: 12 months without solution vs with solution
  const chartData = Array.from({ length: 13 }, (_, i) => ({
    month: i === 0 ? 'Dziś' : `${i}m`,
    bez: Math.round((offer.monthly_loss_amount ?? 0) * i),
    z: i === 0 ? 0 : Math.round(((offer.monthly_loss_amount ?? 0) * i) * 0.1 + 500),
  }))

  return (
    <section id="loss" ref={ref} className="py-20 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Ile tracisz każdego dnia?
            </h2>
            <p className="text-gray-500 text-lg">Oto realna kalkulacja kosztów braku działania</p>
          </div>
        </FadeIn>

        {/* Live counter */}
        <FadeIn delay={200}>
          <div className="bg-white rounded-3xl border border-red-100 p-8 mb-8 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
              Od momentu otwarcia tej strony straciłeś już
            </p>
            <div className="text-6xl md:text-7xl font-black text-[#E74C3C] tabular-nums animate-pulse">
              {lossNow.toFixed(2)} PLN
            </div>
            <p className="text-gray-400 text-sm mt-3">
              ({((dailyLoss / 86400) * 3600).toFixed(0)} PLN/godz · {dailyLoss.toFixed(0)} PLN/dzień)
            </p>
          </div>
        </FadeIn>

        {/* Stats grid */}
        <FadeIn delay={300}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <LossCard label="Strata dzienna" value={fmt(offer.daily_loss_amount ?? 0)} color="text-[#E74C3C]" />
            <LossCard label="Strata miesięczna" value={fmt(offer.monthly_loss_amount ?? 0)} color="text-[#E74C3C]" />
            <LossCard label="Strata roczna" value={fmt(offer.yearly_loss_amount ?? 0)} color="text-[#E74C3C]" />
          </div>
        </FadeIn>

        {/* ROI badge */}
        {offer.roi_months && (
          <FadeIn delay={400}>
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#27AE60]/10 text-[#27AE60] font-bold text-lg">
                <Check size={20} />
                Zwrot inwestycji w {offer.roi_months} {offer.roi_months === 1 ? 'miesiąc' : offer.roi_months <= 4 ? 'miesiące' : 'miesięcy'}
              </div>
            </div>
          </FadeIn>
        )}

        {/* Chart */}
        <FadeIn delay={500}>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm font-semibold text-gray-600 mb-4">Projekcja strat — 12 miesięcy</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="bez" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E74C3C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E74C3C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="z" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#27AE60" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#27AE60" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value, name) => [fmt(value as number), name === 'bez' ? 'Bez rozwiązania' : 'Z rozwiązaniem']}
                  contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="bez" stroke="#E74C3C" strokeWidth={2} fill="url(#bez)" name="bez" />
                <Area type="monotone" dataKey="z" stroke="#27AE60" strokeWidth={2} fill="url(#z)" name="z" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><span className="w-3 h-0.5 bg-[#E74C3C] inline-block rounded" />Bez rozwiązania</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><span className="w-3 h-0.5 bg-[#27AE60] inline-block rounded" />Z AM Automations</span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function LossCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-red-50 p-5 text-center shadow-sm">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  )
}

// ─── Solution Section ─────────────────────────────────────────────────────────

function SolutionSection({ offer, onVisible }: { offer: OfferPage; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useIntersection(ref, onVisible)
  const included = (offer.scope_items ?? []).filter(s => s.included)

  return (
    <section ref={ref} className="py-20 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Nasze rozwiązanie</h2>
            {offer.project_type && (
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] font-medium text-sm">
                {offer.project_type}
              </span>
            )}
          </div>
        </FadeIn>

        {offer.solution_description && (
          <FadeIn delay={100}>
            <p className="text-lg text-gray-600 leading-relaxed text-center mb-12">
              {offer.solution_description}
            </p>
          </FadeIn>
        )}

        {included.length > 0 && (
          <FadeIn delay={200}>
            <div className="bg-gray-50 rounded-3xl p-8">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
                Co wchodzi w zakres projektu
              </p>
              <div className="space-y-3">
                {included.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[#6C5CE7] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={13} className="text-white" />
                    </div>
                    <p className="text-gray-700 font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </section>
  )
}

// ─── Timeline Section ─────────────────────────────────────────────────────────

function TimelineSection({ offer, onVisible }: { offer: OfferPage; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useIntersection(ref, onVisible)

  const startDate = offer.start_date ? new Date(offer.start_date) : addDays(new Date(), 7)
  const endDate = addWeeks(startDate, offer.timeline_items?.length ?? 4)

  return (
    <section ref={ref} className="py-20 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Harmonogram realizacji</h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] text-sm font-medium mt-2">
              🚀 Start: {format(startDate, 'd MMMM yyyy', { locale: pl })}
              &nbsp;→&nbsp;
              Koniec: {format(endDate, 'd MMMM yyyy', { locale: pl })}
            </div>
          </div>
        </FadeIn>

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200 hidden sm:block" />
          <div className="space-y-4">
            {(offer.timeline_items ?? []).map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="w-16 flex-shrink-0 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#6C5CE7] flex items-center justify-center text-white font-bold text-sm z-10">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#6C5CE7] uppercase tracking-wider mb-1">{item.week}</p>
                    <p className="font-semibold text-gray-800">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {format(addWeeks(startDate, i), 'd MMMM', { locale: pl })} — {format(addWeeks(startDate, i + 1), 'd MMMM yyyy', { locale: pl })}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Pricing Section ──────────────────────────────────────────────────────────

function PricingSection({
  offer, selected, onSelect, onAccept,
}: {
  offer: OfferPage
  selected: PricingVariant | null
  onSelect: (v: PricingVariant) => void
  onAccept: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <section id="pricing" ref={ref} className="py-20 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Wybierz swój wariant</h2>
            <p className="text-gray-500 text-lg">Każdy wariant można dostosować do potrzeb</p>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {offer.pricing_variants.map((variant, i) => (
              <button
                key={i}
                onClick={() => onSelect(variant)}
                className={`text-left rounded-3xl border-2 p-6 transition-all relative ${
                  selected?.name === variant.name
                    ? 'border-[#6C5CE7] shadow-xl shadow-[#6C5CE7]/20 bg-white scale-[1.02]'
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                }`}
              >
                {variant.is_recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#6C5CE7] text-white text-xs font-bold whitespace-nowrap">
                    Najlepiej dopasowany
                  </div>
                )}
                <p className="font-bold text-gray-800 text-lg mb-1">{variant.name}</p>
                <p className="text-3xl font-black text-gray-900 mb-4">
                  {fmt(variant.price)}
                </p>
                <div className="space-y-2">
                  {variant.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <Check size={14} className="text-[#27AE60] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{f}</span>
                    </div>
                  ))}
                </div>
                {variant.ai_match_reason && selected?.name === variant.name && (
                  <div className="mt-4 text-xs text-[#6C5CE7] bg-[#6C5CE7]/10 rounded-xl px-3 py-2 leading-relaxed">
                    {variant.ai_match_reason}
                  </div>
                )}
              </button>
            ))}
          </div>
        </FadeIn>

        {offer.payment_terms && (
          <FadeIn delay={200}>
            <p className="text-center text-sm text-gray-500 mb-8">
              💳 {offer.payment_terms}
            </p>
          </FadeIn>
        )}

        <FadeIn delay={300}>
          <div className="text-center">
            <button
              onClick={onAccept}
              className="px-10 py-5 rounded-2xl bg-[#6C5CE7] text-white font-bold text-xl hover:bg-[#5849c4] transition-all shadow-xl shadow-[#6C5CE7]/30 hover:shadow-2xl hover:shadow-[#6C5CE7]/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              Akceptuję ofertę i rezerwuję termin →
            </button>
            {selected && (
              <p className="text-sm text-gray-400 mt-3">
                Wybrany wariant: <strong className="text-gray-600">{selected.name}</strong> — {fmt(selected.price)}
              </p>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Accept Modal ─────────────────────────────────────────────────────────────

function AcceptModal({
  offer,
  variant,
  onClose,
  onConfirm,
}: {
  offer: OfferPage
  variant: PricingVariant
  onClose: () => void
  onConfirm: (startDate: string) => void
}) {
  const [name, setName] = useState('')
  const [checked, setChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const startDate = offer.start_date
    ? format(new Date(offer.start_date), 'd MMMM yyyy', { locale: pl })
    : format(addDays(new Date(), 7), 'd MMMM yyyy', { locale: pl })

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Podaj imię i nazwisko'); return }
    if (!checked) { setError('Zaakceptuj warunki oferty'); return }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/offers/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: offer.public_slug,
          variant_name: variant.name,
          client_confirmation_name: name,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Błąd serwera'); return }
      onConfirm(startDate)
    } catch {
      setError('Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400"
        >
          <X size={18} />
        </button>

        <h3 className="text-2xl font-bold text-gray-900 mb-2">Potwierdzenie zamówienia</h3>
        <p className="text-gray-500 text-sm mb-6">Proszę potwierdzić szczegóły przed akceptacją</p>

        {/* Summary */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Wariant</span>
            <span className="font-semibold">{variant.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Inwestycja</span>
            <span className="font-bold text-[#6C5CE7]">{fmt(variant.price)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Zaliczka (50%)</span>
            <span className="font-semibold">{fmt(Math.round(variant.price * 0.5))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Start projektu</span>
            <span className="font-semibold text-[#27AE60]">{startDate}</span>
          </div>
        </div>

        {/* Name input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Imię i nazwisko (potwierdzenie tożsamości)
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jan Kowalski"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
          />
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[#6C5CE7]"
          />
          <span className="text-sm text-gray-600 leading-relaxed">
            Akceptuję warunki oferty i zobowiązuję się do wpłaty zaliczki{' '}
            <strong>{fmt(Math.round(variant.price * 0.5))}</strong> w ciągu 7 dni od potwierdzenia
          </span>
        </label>

        {error && <p className="text-[#E74C3C] text-sm mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-[#6C5CE7] text-white font-bold text-lg hover:bg-[#5849c4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 size={18} className="animate-spin" />Przetwarzam…</> : 'Potwierdzam'}
        </button>
      </div>
    </div>
  )
}

// ─── Thank You Page ───────────────────────────────────────────────────────────

function ThankYouPage({
  offer,
  startDate,
  variant,
}: {
  offer: OfferPage
  startDate: string
  variant: PricingVariant | null
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#27AE60]/5 via-white to-[#6C5CE7]/5 flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <div className="w-20 h-20 rounded-full bg-[#27AE60]/10 flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-[#27AE60]" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Zamówienie przyjęte!</h1>
        <p className="text-gray-500 text-lg leading-relaxed mb-8">
          Dziękujemy za potwierdzenie. Otrzymasz fakturę zaliczkową w ciągu 24 godzin.
          {startDate && <><br /><strong className="text-gray-700">Projekt rusza: {startDate}</strong></>}
        </p>
        {variant && (
          <div className="bg-[#6C5CE7]/5 border border-[#6C5CE7]/20 rounded-2xl p-5 mb-6 inline-block">
            <p className="text-sm text-gray-500">Wybrany wariant: <strong>{variant.name}</strong></p>
            <p className="text-2xl font-black text-[#6C5CE7]">{fmt(variant.price)}</p>
          </div>
        )}
        <p className="text-sm text-gray-400">
          W razie pytań: <a href="mailto:hello@amautomations.pl" className="text-[#6C5CE7] hover:underline">hello@amautomations.pl</a>
        </p>
      </div>
    </div>
  )
}

// ─── FadeIn animation component ───────────────────────────────────────────────

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      {children}
    </div>
  )
}
