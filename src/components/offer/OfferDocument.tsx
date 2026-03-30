import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { Deal, leadFullName } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchOfferResult {
  problem_summary: string
  recommended_project_type: string
  recommended_scope: string[]
  price_range_min: number
  price_range_max: number
  estimated_time: string
  key_selling_points: string[]
  roi_calculation: string
}

interface OfferDocumentProps {
  deal: Deal
  matchResult?: MatchOfferResult | null
}

// ─── Colours ─────────────────────────────────────────────────────────────────

const C = {
  primary:   '#6C5CE7',
  secondary: '#00B894',
  dark:      '#1A1A2E',
  gray:      '#636E72',
  lightGray: '#F8F9FA',
  white:     '#FFFFFF',
  border:    '#E2E8F0',
  purpleFade:'#EDE9FF',
  greenFade: '#E8FAF5',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.dark,
    backgroundColor: C.white,
  },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 40,
    paddingVertical: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerBrand: {
    flexDirection: 'column',
  },
  headerLogo: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 1,
  },
  headerTagline: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  headerMetaText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },

  // Title block
  titleBlock: {
    backgroundColor: C.lightGray,
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderBottom: `2 solid ${C.primary}`,
  },
  docLabel: {
    fontSize: 8,
    color: C.primary,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dealTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 4,
  },
  dealSubtitle: {
    fontSize: 10,
    color: C.gray,
  },

  // Body
  body: {
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 60,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `1 solid ${C.border}`,
  },
  bodyText: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.6,
  },

  // Bullet list
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 12,
    color: C.secondary,
    marginRight: 8,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  bulletText: {
    fontSize: 10,
    color: C.dark,
    flex: 1,
    lineHeight: 1.5,
  },

  // Price + timeline box
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaBox: {
    flex: 1,
    backgroundColor: C.lightGray,
    borderRadius: 4,
    padding: 12,
  },
  metaBoxAccent: {
    flex: 1,
    backgroundColor: C.purpleFade,
    borderRadius: 4,
    padding: 12,
  },
  metaLabel: {
    fontSize: 8,
    color: C.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
  },
  metaValueGreen: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.secondary,
  },

  // ROI box
  roiBox: {
    backgroundColor: C.greenFade,
    borderLeft: `3 solid ${C.secondary}`,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 2,
    marginTop: 4,
  },
  roiText: {
    fontSize: 9,
    color: C.dark,
    lineHeight: 1.6,
  },

  // Next steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  stepNum: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    marginRight: 10,
    width: 14,
  },
  stepText: {
    fontSize: 10,
    color: C.dark,
    flex: 1,
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.dark,
    paddingHorizontal: 40,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.45)',
  },
  footerBrand: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.70)',
    fontFamily: 'Helvetica-Bold',
  },

  // Divider
  divider: {
    borderBottom: `1 solid ${C.border}`,
    marginVertical: 12,
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bullet}>›</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function OfferDocument({ deal, matchResult }: OfferDocumentProps) {
  const lead = deal.lead
  const clientName = lead ? leadFullName(lead) : deal.title
  const company = lead?.company ?? deal.title
  const today = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })

  const priceMin = matchResult?.price_range_min ?? deal.suggested_price_min
  const priceMax = matchResult?.price_range_max ?? deal.suggested_price_max
  const priceStr =
    priceMin != null && priceMax != null
      ? `${priceMin.toLocaleString('pl-PL')} – ${priceMax.toLocaleString('pl-PL')} PLN`
      : deal.value != null
      ? `${deal.value.toLocaleString('pl-PL')} PLN`
      : 'Do ustalenia'

  const timeStr  = matchResult?.estimated_time  ?? deal.project_type ?? '—'
  const problem  = matchResult?.problem_summary  ?? deal.client_problem ?? '—'
  const solution = deal.suggested_solution ?? matchResult?.recommended_project_type ?? '—'
  const scope    = matchResult?.recommended_scope ?? []
  const benefits = matchResult?.key_selling_points ?? []
  const roi      = matchResult?.roi_calculation ?? ''

  const nextSteps = [
    `Akceptacja oferty do ${new Date(Date.now() + 7 * 86400000).toLocaleDateString('pl-PL')}`,
    'Wpłata zaliczki 30% — wystawiam fakturę',
    'Kick-off call (30 min) — ustalamy szczegóły i harmonogram',
    'Start prac w ciągu 5 dni roboczych od zaliczki',
  ]

  return (
    <Document
      title={`Oferta — ${deal.title}`}
      author="AM Automations"
      subject={`Oferta dla ${company}`}
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerBrand}>
            <Text style={s.headerLogo}>AM Automations</Text>
            <Text style={s.headerTagline}>Strony · Chatboty AI · Systemy</Text>
          </View>
          <View style={s.headerMeta}>
            <Text style={s.headerMetaText}>Data: {today}</Text>
            <Text style={s.headerMetaText}>hello@am-automations.pl</Text>
            <Text style={s.headerMetaText}>am-automations.pl</Text>
          </View>
        </View>

        {/* ── Title block ── */}
        <View style={s.titleBlock}>
          <Text style={s.docLabel}>Oferta handlowa</Text>
          <Text style={s.dealTitle}>{deal.title}</Text>
          <Text style={s.dealSubtitle}>{clientName}{company !== clientName ? ` · ${company}` : ''}</Text>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* 1. Problem */}
          <Section title="1. Problem klienta">
            <Text style={s.bodyText}>{problem}</Text>
          </Section>

          {/* 2. Rozwiązanie */}
          <Section title="2. Proponowane rozwiązanie">
            <Text style={s.bodyText}>{solution}</Text>
          </Section>

          {/* 3. Zakres prac */}
          {scope.length > 0 && (
            <Section title="3. Zakres prac">
              <BulletList items={scope} />
            </Section>
          )}

          {/* 4. Harmonogram i wycena */}
          <Section title="4. Harmonogram i wycena">
            <View style={s.metaRow}>
              <View style={s.metaBoxAccent}>
                <Text style={s.metaLabel}>Wycena netto</Text>
                <Text style={s.metaValue}>{priceStr}</Text>
              </View>
              <View style={s.metaBox}>
                <Text style={s.metaLabel}>Czas realizacji</Text>
                <Text style={s.metaValueGreen}>{timeStr}</Text>
              </View>
            </View>
          </Section>

          {/* 5. Kluczowe korzyści */}
          {benefits.length > 0 && (
            <Section title="5. Kluczowe korzyści">
              <BulletList items={benefits} />
            </Section>
          )}

          {/* 6. ROI */}
          {roi && (
            <Section title="6. Zwrot z inwestycji">
              <View style={s.roiBox}>
                <Text style={s.roiText}>{roi}</Text>
              </View>
            </Section>
          )}

          {/* 7. Następne kroki */}
          <Section title="7. Następne kroki">
            {nextSteps.map((step, i) => (
              <View key={i} style={s.stepRow}>
                <Text style={s.stepNum}>{i + 1}.</Text>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </Section>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>AM Automations</Text>
          <Text style={s.footerText}>hello@am-automations.pl · am-automations.pl</Text>
          <Text style={s.footerText}>Oferta ważna 14 dni</Text>
        </View>

      </Page>
    </Document>
  )
}
