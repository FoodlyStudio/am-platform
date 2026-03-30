'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  differenceInCalendarDays,
  startOfDay,
  subDays,
  isToday,
  parseISO,
} from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Lead, Deal, OutreachMessage, OutreachMessageType, leadFullName } from '@/types'
import { AI_SCORE_LABELS } from '@/lib/constants'
import { Copy, RefreshCw, CheckCheck, ExternalLink, ChevronDown, Flame, Phone, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutreachItem {
  id: string
  lead: Lead
  deal?: Deal
  messageType: OutreachMessageType
  defaultMessage: string
  daysWaiting?: number
  dealId?: string
}

interface OutreachSections {
  invites: OutreachItem[]
  dm1: OutreachItem[]
  fu1: OutreachItem[]
  fu2: OutreachItem[]
  offerFu: OutreachItem[]
  reengagement: OutreachItem[]
}

interface TodayStats {
  invites: number
  dms: number
  followups: number
}

interface WeeklyMetrics {
  acceptanceRate: number
  replyRate: number
  totalSent: number
}

// ─── Template builder ─────────────────────────────────────────────────────────

function buildDefaultMessage(
  lead: Lead,
  type: OutreachMessageType,
  deal?: Deal,
): string {
  const name = lead.first_name
  const company = lead.company
  const segment = lead.segment ?? 'usługowej'
  const icebreaker =
    lead.ai_icebreaker ??
    `Obserwuję ${company} i widzę potencjał, o którym warto porozmawiać.`
  const signal = lead.buying_signal ?? 'potencjał do automatyzacji procesów'
  const q = Math.ceil((new Date().getMonth() + 1) / 3)

  switch (type) {
    case 'connection_request':
      return `Cześć ${name}! Zajmuję się automatyzacją i stronami z konwersją dla firm usługowych. Widzę, że ${company} — ${signal}. Chętnie nawiążę kontakt!`

    case 'dm1_icebreaker':
      return `Cześć ${name}!\n\n${icebreaker}\n\nDla firm w sektorze ${segment} robimy:\n• Strony z konwersją (2000–5000 PLN)\n• Chatboty AI i automatyzacje (3000–8000 PLN)\n• Systemy zamiast Excela (8000–25000 PLN)\n\nCzy to temat na 15 minut rozmowy?`

    case 'fu1_case_study':
      return `Cześć ${name}, wracam z konkretnym przykładem.\n\nNiedawno skończyliśmy projekt dla firmy z sektora ${segment} — w 3 tygodnie wdrożyliśmy chatbota AI, który skrócił czas obsługi zapytań o 60%.\n\nCzy widzisz podobne wyzwanie w ${company}?`

    case 'fu2_calendar':
      return `Cześć ${name}, ostatnia wiadomość z mojej strony.\n\nJeśli automatyzacja lub nowa strona jest na liście na Q${q}, chętnie porozmawiamy 20 min bez zobowiązań:\nhttps://cal.com/am-automations/discovery\n\nJeśli nie — życzę powodzenia z ${company}!`

    case 'post_offer_48h':
      return `Cześć ${name}, sprawdzam czy oferta dotarła — wysłałem ją 2 dni temu.\n\nMasz pytania co do zakresu lub wyceny? Chętnie omówię szczegóły.`

    case 'post_offer_5d':
      return `Cześć ${name}, wracam po tygodniu.\n\nCzy miałeś okazję przejrzeć propozycję dla ${company}? Mogę też przygotować alternatywę jeśli zakres lub budżet nie pasuje.`

    case 'post_offer_14d':
      return `Cześć ${name}, zamykam ten wątek żeby nie być natarczywy.\n\nJeśli temat wróci na agendę, jestem do dyspozycji. Dobrego tygodnia!`

    case 'reengagement_90d':
      return `Cześć ${name}! Wracam po czasie — rozmawialiśmy o ${deal?.client_problem ?? 'automatyzacji w ' + company}.\n\nOd tamtej pory skończyliśmy kilka podobnych projektów. Czy temat wrócił na agendę?`

    default:
      return ''
  }
}

// ─── Section assignment logic ─────────────────────────────────────────────────

function buildSections(
  leads: Lead[],
  allMessages: OutreachMessage[],
  offerDeals: Deal[],
  reengagementDeals: Deal[],
): OutreachSections {
  const msgByLead = new Map<string, OutreachMessage[]>()
  const msgByDeal = new Map<string, OutreachMessage[]>()

  for (const msg of allMessages) {
    if (msg.lead_id) {
      const list = msgByLead.get(msg.lead_id) ?? []
      list.push(msg)
      msgByLead.set(msg.lead_id, list)
    }
    if (msg.deal_id) {
      const list = msgByDeal.get(msg.deal_id) ?? []
      list.push(msg)
      msgByDeal.set(msg.deal_id, list)
    }
  }

  const invites: OutreachItem[] = []
  const dm1: OutreachItem[] = []
  const fu1: OutreachItem[] = []
  const fu2: OutreachItem[] = []

  for (const lead of leads) {
    const msgs = msgByLead.get(lead.id) ?? []

    // Skip leads with positive/neutral replies — they're already in pipeline
    if (msgs.some((m) => m.status === 'replied_positive' || m.status === 'replied_neutral')) continue

    const connReq = msgs.find((m) => m.message_type === 'connection_request')
    const dm1Msg  = msgs.find((m) => m.message_type === 'dm1_icebreaker')
    const fu1Msg  = msgs.find((m) => m.message_type === 'fu1_case_study')
    const fu2Msg  = msgs.find((m) => m.message_type === 'fu2_calendar')

    if (!connReq) {
      // A: no connection request sent yet
      invites.push({
        id: `${lead.id}:connection_request`,
        lead,
        messageType: 'connection_request',
        defaultMessage: buildDefaultMessage(lead, 'connection_request'),
      })
    } else if (!dm1Msg) {
      // B: connection request sent, no DM1 yet
      dm1.push({
        id: `${lead.id}:dm1_icebreaker`,
        lead,
        messageType: 'dm1_icebreaker',
        defaultMessage: buildDefaultMessage(lead, 'dm1_icebreaker'),
      })
    } else if (!fu1Msg && dm1Msg.status === 'sent') {
      // C: DM1 sent > 3 days ago, no reply, no FU1
      const days = differenceInCalendarDays(
        new Date(),
        new Date(dm1Msg.sent_at ?? dm1Msg.created_at),
      )
      if (days >= 3) {
        fu1.push({
          id: `${lead.id}:fu1_case_study`,
          lead,
          messageType: 'fu1_case_study',
          defaultMessage: buildDefaultMessage(lead, 'fu1_case_study'),
          daysWaiting: days,
        })
      }
    } else if (!fu2Msg && fu1Msg && fu1Msg.status === 'sent') {
      // D: FU1 sent > 5 days ago, no reply, no FU2
      const days = differenceInCalendarDays(
        new Date(),
        new Date(fu1Msg.sent_at ?? fu1Msg.created_at),
      )
      if (days >= 5) {
        fu2.push({
          id: `${lead.id}:fu2_calendar`,
          lead,
          messageType: 'fu2_calendar',
          defaultMessage: buildDefaultMessage(lead, 'fu2_calendar'),
          daysWaiting: days,
        })
      }
    }
  }

  // E: offer follow-ups
  const offerFu: OutreachItem[] = []
  for (const deal of offerDeals) {
    if (!deal.offer_sent_at || !deal.lead) continue
    const msgs = msgByDeal.get(deal.id) ?? []
    const days = differenceInCalendarDays(new Date(), new Date(deal.offer_sent_at))

    const has48h = msgs.some((m) => m.message_type === 'post_offer_48h')
    const has5d  = msgs.some((m) => m.message_type === 'post_offer_5d')
    const has14d = msgs.some((m) => m.message_type === 'post_offer_14d')

    let nextType: OutreachMessageType | null = null
    if      (days >= 14 && !has14d) nextType = 'post_offer_14d'
    else if (days >= 5  && !has5d)  nextType = 'post_offer_5d'
    else if (days >= 2  && !has48h) nextType = 'post_offer_48h'

    if (nextType) {
      offerFu.push({
        id: `${deal.id}:${nextType}`,
        lead: deal.lead,
        deal,
        dealId: deal.id,
        messageType: nextType,
        defaultMessage: buildDefaultMessage(deal.lead, nextType, deal),
        daysWaiting: days,
      })
    }
  }

  // F: re-engagement
  const reengagement: OutreachItem[] = []
  for (const deal of reengagementDeals) {
    if (!deal.lead) continue
    reengagement.push({
      id: `${deal.id}:reengagement_90d`,
      lead: deal.lead,
      deal,
      dealId: deal.id,
      messageType: 'reengagement_90d',
      defaultMessage: buildDefaultMessage(deal.lead, 'reengagement_90d', deal),
    })
  }

  return { invites, dm1, fu1, fu2, offerFu, reengagement }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface HotDeal {
  id: string
  title: string
  company: string
  hot_reason: string
  engagement_score: number
  updated_at: string
  lead_id?: string
}

export default function OutreachPage() {
  const [sections, setSections] = useState<OutreachSections | null>(null)
  const [todayStats, setTodayStats] = useState<TodayStats>({ invites: 0, dms: 0, followups: 0 })
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics>({ acceptanceRate: 0, replyRate: 0, totalSent: 0 })
  const [loading, setLoading] = useState(true)
  const [hotDeals, setHotDeals] = useState<HotDeal[]>([])

  // Per-item message content (starts as defaultMessage, editable + overrideable by AI)
  const [messages, setMessages] = useState<Record<string, string>>({})
  // Items currently being regenerated
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set())
  // Items currently being marked as sent
  const [marking, setMarking] = useState<Set<string>>(new Set())
  // Items dismissed after marking as sent
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // ── Data loading ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const today = new Date()
      const todayStart = startOfDay(today).toISOString()
      const sevenDaysAgo = subDays(today, 7).toISOString()

      // Hot deals
      const { data: hotData } = await supabase
        .from('deals')
        .select('id, title, lead:leads(company), hot_reason, engagement_score, updated_at, lead_id')
        .eq('is_hot', true)
        .not('stage', 'in', '("wygrana","przegrana","nie_teraz")')
        .order('engagement_score', { ascending: false })
        .limit(10)

      setHotDeals(
        (hotData ?? []).map((d) => ({
          id: d.id,
          title: d.title,
          company: (d.lead as { company?: string } | null)?.company ?? d.title,
          hot_reason: d.hot_reason ?? 'Aktywny na ofercie',
          engagement_score: d.engagement_score ?? 0,
          updated_at: d.updated_at,
          lead_id: d.lead_id,
        }))
      )

      const [
        { data: leads },
        { data: allMessages },
        { data: offerDeals },
        { data: reengagementDeals },
        { data: todayMessages },
        { data: weekMessages },
      ] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('status', 'qualified')
          .gte('ai_score', 5)
          .order('ai_score', { ascending: false }),
        supabase
          .from('outreach_messages')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('deals')
          .select('*, lead:leads(*)')
          .eq('stage', 'oferta_prezentowana')
          .not('offer_sent_at', 'is', null),
        supabase
          .from('deals')
          .select('*, lead:leads(*)')
          .in('stage', ['nie_teraz', 'przegrana'])
          .lte('reengagement_date', today.toISOString().split('T')[0])
          .gte('reengagement_date', subDays(today, 7).toISOString().split('T')[0]),
        supabase
          .from('outreach_messages')
          .select('message_type')
          .gte('sent_at', todayStart),
        supabase
          .from('outreach_messages')
          .select('message_type, status')
          .gte('created_at', sevenDaysAgo),
      ])

      const builtSections = buildSections(
        leads ?? [],
        allMessages ?? [],
        offerDeals ?? [],
        reengagementDeals ?? [],
      )
      setSections(builtSections)

      // Initialize message content from defaults
      const initMsgs: Record<string, string> = {}
      const allItems = [
        ...builtSections.invites,
        ...builtSections.dm1,
        ...builtSections.fu1,
        ...builtSections.fu2,
        ...builtSections.offerFu,
        ...builtSections.reengagement,
      ]
      for (const item of allItems) {
        initMsgs[item.id] = item.defaultMessage
      }
      setMessages((prev) => ({ ...initMsgs, ...prev }))

      // Today stats
      const td = todayMessages ?? []
      setTodayStats({
        invites:   td.filter((m) => m.message_type === 'connection_request').length,
        dms:       td.filter((m) => m.message_type === 'dm1_icebreaker').length,
        followups: td.filter((m) =>
          ['fu1_case_study', 'fu2_calendar', 'post_offer_48h', 'post_offer_5d', 'post_offer_14d'].includes(m.message_type),
        ).length,
      })

      // Weekly metrics
      const wk = weekMessages ?? []
      const sent = wk.length
      const connSent  = wk.filter((m) => m.message_type === 'connection_request').length
      const dm1Sent   = wk.filter((m) => m.message_type === 'dm1_icebreaker').length
      const replies   = wk.filter((m) => m.status === 'replied_positive' || m.status === 'replied_neutral').length
      setWeeklyMetrics({
        totalSent: sent,
        acceptanceRate: connSent > 0 ? Math.round((dm1Sent / connSent) * 100) : 0,
        replyRate:      dm1Sent  > 0 ? Math.round((replies / dm1Sent) * 100)  : 0,
      })
    } catch (err) {
      console.error(err)
      toast.error('Błąd ładowania kolejki')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCopy = (item: OutreachItem) => {
    const msg = messages[item.id] || item.defaultMessage
    navigator.clipboard.writeText(msg)
    toast.success('Skopiowano!')
  }

  const handleRegenerate = async (item: OutreachItem) => {
    setRegenerating((prev) => new Set(prev).add(item.id))
    try {
      const res = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: item.lead.id,
          dealId: item.dealId,
          messageType: item.messageType,
        }),
      })
      const { message, error } = await res.json()
      if (error) throw new Error(error)
      setMessages((prev) => ({ ...prev, [item.id]: message }))
      toast.success('Wiadomość wygenerowana')
    } catch {
      toast.error('Błąd generowania — spróbuj ponownie')
    } finally {
      setRegenerating((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handleMarkSent = async (item: OutreachItem) => {
    setMarking((prev) => new Set(prev).add(item.id))
    try {
      const supabase = createClient()
      const messageContent = messages[item.id] || item.defaultMessage
      const now = new Date().toISOString()

      await supabase.from('outreach_messages').insert({
        lead_id: item.lead.id,
        deal_id: item.dealId ?? null,
        message_type: item.messageType,
        message_content: messageContent,
        status: 'sent',
        sent_at: now,
      })

      setDismissed((prev) => new Set(prev).add(item.id))
      setTodayStats((prev) => {
        const type = item.messageType
        if (type === 'connection_request') return { ...prev, invites: prev.invites + 1 }
        if (type === 'dm1_icebreaker') return { ...prev, dms: prev.dms + 1 }
        return { ...prev, followups: prev.followups + 1 }
      })
      toast.success('Oznaczono jako wysłane')
    } catch {
      toast.error('Błąd zapisu')
    } finally {
      setMarking((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const visibleItems = (items: OutreachItem[]) =>
    items.filter((item) => !dismissed.has(item.id))

  const totalTasks = sections
    ? visibleItems(sections.invites).length +
      visibleItems(sections.dm1).length +
      visibleItems(sections.fu1).length +
      visibleItems(sections.fu2).length +
      visibleItems(sections.offerFu).length +
      visibleItems(sections.reengagement).length
    : 0

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Outreach Queue</h1>
        <p className="text-sm text-white/50 mt-0.5">
          {totalTasks > 0
            ? `${totalTasks} zadań na dziś`
            : 'Wszystko gotowe — brak zaległych zadań 🎉'}
        </p>
      </div>

      {/* Today's summary + weekly metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatPill label="Zaproszenia dziś"    value={todayStats.invites}          color="text-primary" />
        <StatPill label="DM-y dziś"           value={todayStats.dms}              color="text-secondary" />
        <StatPill label="Follow-upy dziś"     value={todayStats.followups}        color="text-yellow-400" />
        <StatPill label="Acceptance rate (7d)" value={`${weeklyMetrics.acceptanceRate}%`} color="text-[#00CEC9]" />
        <StatPill label="Reply rate (7d)"     value={`${weeklyMetrics.replyRate}%`}       color="text-accent" />
      </div>

      {/* Hot Leads Section */}
      {hotDeals.length > 0 && (
        <section className="rounded-2xl overflow-hidden border border-red-500/30">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-900/60 to-red-800/40 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-bold text-red-300 uppercase tracking-widest">Gorące Leady</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/30 text-red-300">
                {hotDeals.length}
              </span>
            </div>
            <span className="text-[10px] text-red-400/70">Aktywni na ofercie — zadzwoń teraz</span>
          </div>

          {/* Cards */}
          <div className="bg-red-950/20 divide-y divide-red-500/10">
            {hotDeals.map((deal) => (
              <div key={deal.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-red-900/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Flame icon */}
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Flame size={14} className="text-red-400" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{deal.company}</p>
                    <p className="text-xs text-red-300/70 truncate">{deal.hot_reason}</p>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Engagement score */}
                  <div className="text-center hidden sm:block">
                    <p className="text-sm font-bold text-red-400 tabular-nums">{deal.engagement_score}</p>
                    <p className="text-[9px] text-white/30 uppercase">score</p>
                  </div>

                  {/* Last activity */}
                  <span className="text-[10px] text-white/30 hidden md:block">
                    {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/sales/${deal.id}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/20 transition-all"
                    >
                      <Phone size={11} />
                      <span className="hidden sm:inline">Zadzwoń</span>
                    </Link>
                    <Link
                      href={`/sales/${deal.id}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <MessageSquare size={11} />
                      <span className="hidden sm:inline">DM</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sections */}
      {sections && (
        <>
          <OutreachSection
            title="Wyślij zaproszenie"
            subtitle="Nowe leady, score ≥ 5, brak connection request"
            accent="#6C5CE7"
            items={visibleItems(sections.invites)}
            messages={messages}
            setMessages={setMessages}
            regenerating={regenerating}
            marking={marking}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            onMarkSent={handleMarkSent}
            showNoteForHighScore
          />

          <OutreachSection
            title="Wyślij DM1"
            subtitle="Zaproszenie zaakceptowane — pierwszy kontakt"
            accent="#0984E3"
            items={visibleItems(sections.dm1)}
            messages={messages}
            setMessages={setMessages}
            regenerating={regenerating}
            marking={marking}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            onMarkSent={handleMarkSent}
          />

          <OutreachSection
            title="Follow-up 1"
            subtitle="DM1 wysłany > 3 dni temu, brak odpowiedzi"
            accent="#00B894"
            items={visibleItems(sections.fu1)}
            messages={messages}
            setMessages={setMessages}
            regenerating={regenerating}
            marking={marking}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            onMarkSent={handleMarkSent}
          />

          <OutreachSection
            title="Follow-up 2 (ostatni)"
            subtitle="FU1 wysłany > 5 dni temu — z linkiem do kalendarza"
            accent="#FDCB6E"
            items={visibleItems(sections.fu2)}
            messages={messages}
            setMessages={setMessages}
            regenerating={regenerating}
            marking={marking}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            onMarkSent={handleMarkSent}
          />

          <OutreachSection
            title="Follow-up po ofercie"
            subtitle="Oferta prezentowana — sekwencja 48h / 5d / 14d"
            accent="#E17055"
            items={visibleItems(sections.offerFu)}
            messages={messages}
            setMessages={setMessages}
            regenerating={regenerating}
            marking={marking}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            onMarkSent={handleMarkSent}
            showDays
          />

          <OutreachSection
            title="Re-engagement"
            subtitle="Nie teraz / Przegrana — reengagement_date = dziś"
            accent="#B2BEC3"
            items={visibleItems(sections.reengagement)}
            messages={messages}
            setMessages={setMessages}
            regenerating={regenerating}
            marking={marking}
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            onMarkSent={handleMarkSent}
          />
        </>
      )}
    </div>
  )
}

// ─── OutreachSection ──────────────────────────────────────────────────────────

const PREVIEW_COUNT = 3

function OutreachSection({
  title,
  subtitle,
  accent,
  items,
  messages,
  setMessages,
  regenerating,
  marking,
  onCopy,
  onRegenerate,
  onMarkSent,
  showNoteForHighScore = false,
  showDays = false,
}: {
  title: string
  subtitle: string
  accent: string
  items: OutreachItem[]
  messages: Record<string, string>
  setMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>
  regenerating: Set<string>
  marking: Set<string>
  onCopy: (item: OutreachItem) => void
  onRegenerate: (item: OutreachItem) => void
  onMarkSent: (item: OutreachItem) => void
  showNoteForHighScore?: boolean
  showDays?: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)

  if (items.length === 0) return null

  const visible = showAll ? items : items.slice(0, PREVIEW_COUNT)
  const hiddenCount = items.length - PREVIEW_COUNT

  return (
    <section>
      {/* Section header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accent }} />
          <div className="text-left">
            <span className="text-sm font-semibold text-white group-hover:text-white/90">{title}</span>
            <span className="text-xs text-white/40 ml-2">{subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${accent}25`, color: accent }}
          >
            {items.length}
          </span>
          <ChevronDown
            size={14}
            className={`text-white/30 transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-3">
          {visible.map((item) => (
            <OutreachItemCard
              key={item.id}
              item={item}
              message={messages[item.id] ?? item.defaultMessage}
              isRegenerating={regenerating.has(item.id)}
              isMarking={marking.has(item.id)}
              accentColor={accent}
              showHighScoreNote={showNoteForHighScore && (item.lead.ai_score ?? 0) >= 9}
              showDays={showDays}
              onMessageChange={(val) =>
                setMessages((prev) => ({ ...prev, [item.id]: val }))
              }
              onCopy={() => onCopy(item)}
              onRegenerate={() => onRegenerate(item)}
              onMarkSent={() => onMarkSent(item)}
            />
          ))}

          {hiddenCount > 0 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-xs text-white/40 hover:text-white/60 border border-white/5 rounded-xl hover:border-white/10 transition-all"
            >
              Pokaż {hiddenCount} więcej
            </button>
          )}
        </div>
      )}
    </section>
  )
}

// ─── OutreachItemCard ─────────────────────────────────────────────────────────

function OutreachItemCard({
  item,
  message,
  isRegenerating,
  isMarking,
  accentColor,
  showHighScoreNote,
  showDays,
  onMessageChange,
  onCopy,
  onRegenerate,
  onMarkSent,
}: {
  item: OutreachItem
  message: string
  isRegenerating: boolean
  isMarking: boolean
  accentColor: string
  showHighScoreNote: boolean
  showDays: boolean
  onMessageChange: (val: string) => void
  onCopy: () => void
  onRegenerate: () => void
  onMarkSent: () => void
}) {
  const score = item.lead.ai_score
  const scoreLabel = score != null ? AI_SCORE_LABELS[score] : null

  return (
    <div className="bg-card border border-white/5 rounded-xl p-4 space-y-3">

      {/* Lead info */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {item.lead.first_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{leadFullName(item.lead)}</p>
            <p className="text-xs text-white/40 truncate">{item.lead.company}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* AI Score badge */}
          {score != null && (
            <span className={`text-xs font-bold tabular-nums ${scoreLabel?.color ?? 'text-white/50'}`}>
              {score}/10
            </span>
          )}

          {/* Segment */}
          {item.lead.segment && (
            <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
              {item.lead.segment}
            </span>
          )}

          {/* Days waiting */}
          {showDays && item.daysWaiting != null && (
            <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
              {item.daysWaiting}d temu
            </span>
          )}

          {/* LinkedIn */}
          {item.lead.linkedin_url && (
            <a
              href={item.lead.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Otwórz profil LinkedIn"
            >
              <ExternalLink size={13} className="text-[#74B9FF]" />
            </a>
          )}
        </div>
      </div>

      {/* High score note hint */}
      {showHighScoreNote && (
        <div
          className="text-[11px] px-2.5 py-1.5 rounded-lg"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          Score {score}/10 — dodaj notatkę do zaproszenia dla wyższego acceptance rate
        </div>
      )}

      {/* Message textarea */}
      <textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        rows={message.split('\n').length + 1}
        className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl p-3 text-xs text-white/80 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        style={{ minHeight: '72px', maxHeight: '240px' }}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white transition-all"
        >
          <Copy size={12} />
          Kopiuj
        </button>

        <button
          onClick={onMarkSent}
          disabled={isMarking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{
            background: `${accentColor}20`,
            color: accentColor,
            border: `1px solid ${accentColor}30`,
          }}
        >
          {isMarking ? (
            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCheck size={12} />
          )}
          Wysłano
        </button>

        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-primary/10 text-xs text-white/40 hover:text-primary transition-all disabled:opacity-50 ml-auto"
          title="Wygeneruj nową wersję przez AI"
        >
          <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
          {isRegenerating ? 'Generuję…' : 'Regeneruj'}
        </button>
      </div>
    </div>
  )
}

// ─── StatPill ─────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-card border border-white/5 rounded-xl px-3 py-2.5">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{label}</p>
    </div>
  )
}
