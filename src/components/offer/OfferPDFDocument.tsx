// NOTE: import this file dynamically only (ssr: false) – react-pdf requires browser globals

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ─── Types (exported for use in offer page) ──────────────────────────────────

export interface ScopeItem {
  id: string
  text: string
  included: boolean
}

export interface TimelineStage {
  id: string
  week: string
  name: string
}

export interface PriceBreakdownItem {
  id: string
  label: string
  amount: number
}

export interface OfferFormData {
  clientName: string
  company: string
  position: string
  conversationSummary: string
  identifiedProblem: string
  businessImpact: string
  projectType: string
  solutionDescription: string
  scopeItems: ScopeItem[]
  timelineStages: TimelineStage[]
  totalPrice: number
  priceBreakdown: PriceBreakdownItem[]
  discount: number
  discountType: 'PLN' | '%'
  paymentTerms: string
  nextStepsText: string
  additionalNotes: string
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  primary:    '#6C5CE7',
  dark:       '#1A1A2E',
  darkMid:    '#16213E',
  white:      '#FFFFFF',
  gray:       '#636E72',
  light:      '#F8F9FA',
  lightPurp:  '#F0EDFF',
  border:     '#E2E8F0',
  green:      '#00B894',
  greenFade:  '#E8FAF5',
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Cover Page ──
  coverPage: {
    fontFamily: 'Helvetica',
    backgroundColor: C.dark,
    padding: 0,
  },
  coverInner: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingVertical: 60,
  },
  coverTopBar: {
    height: 5,
    backgroundColor: C.primary,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  coverBottomBar: {
    height: 5,
    backgroundColor: C.primary,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  coverAM: {
    fontSize: 80,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 6,
    marginBottom: 0,
    lineHeight: 1,
  },
  coverBrandSub: {
    fontSize: 14,
    color: C.primary,
    letterSpacing: 8,
    marginBottom: 50,
  },
  coverDivider: {
    width: 80,
    height: 2,
    backgroundColor: C.primary,
    marginBottom: 40,
  },
  coverOferta: {
    fontSize: 40,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 10,
    marginBottom: 50,
  },
  coverForLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  coverCompany: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  coverContact: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 50,
  },
  coverDate: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1,
  },

  // ── Content Pages ──
  contentPage: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: C.dark,
    backgroundColor: C.white,
    paddingHorizontal: 50,
    paddingTop: 36,
    paddingBottom: 52,
  },

  // ── Section Heading ──
  sectionHeading: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 6,
  },
  sectionLine: {
    height: 2,
    backgroundColor: C.primary,
    width: 56,
    marginBottom: 22,
  },

  // ── Sub-heading ──
  subHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 8,
  },

  // ── Body text ──
  bodyText: {
    fontSize: 11,
    color: C.dark,
    lineHeight: 1.65,
  },

  // ── Quote / highlight box ──
  quoteBox: {
    borderLeft: `3 solid ${C.primary}`,
    backgroundColor: C.lightPurp,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 14,
    borderRadius: 2,
  },
  quoteLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  quoteText: {
    fontSize: 11,
    color: C.dark,
    lineHeight: 1.6,
  },

  // ── Impact box ──
  impactBox: {
    backgroundColor: C.light,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },

  // ── Badge ──
  badge: {
    backgroundColor: `${C.primary}20`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    letterSpacing: 0.5,
  },

  // ── Scope items ──
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  checkBox: {
    width: 15,
    height: 15,
    borderRadius: 3,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  checkMark: {
    fontSize: 9,
    color: C.white,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.4,
  },
  scopeText: {
    fontSize: 11,
    color: C.dark,
    flex: 1,
    lineHeight: 1.5,
  },

  // ── Timeline ──
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
    paddingVertical: 10,
    borderBottom: `1 solid ${C.border}`,
  },
  timelineWeekBadge: {
    backgroundColor: C.primary,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    width: 90,
    flexShrink: 0,
    marginRight: 16,
    marginTop: 2,
  },
  timelineWeekText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  timelineName: {
    fontSize: 11,
    color: C.dark,
    flex: 1,
    lineHeight: 1.5,
  },
  timelineTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.dark,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  timelineTotalLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timelineTotalValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
  },

  // ── Pricing ──
  priceTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.dark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 3,
    marginBottom: 2,
  },
  priceTableHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: 'rgba(255,255,255,0.60)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottom: `1 solid ${C.border}`,
  },
  priceRowAlt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: C.light,
    borderBottom: `1 solid ${C.border}`,
  },
  priceLabel: {
    fontSize: 11,
    color: C.dark,
  },
  priceAmount: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },
  finalPriceBox: {
    backgroundColor: C.primary,
    borderRadius: 5,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  finalPriceLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  finalPriceValue: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  crossedPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 2,
  },
  paymentBox: {
    backgroundColor: C.light,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 8,
    color: C.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  paymentValue: {
    fontSize: 11,
    color: C.dark,
    fontFamily: 'Helvetica-Bold',
  },
  roiBox: {
    backgroundColor: C.greenFade,
    borderLeft: `3 solid ${C.green}`,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 2,
    marginTop: 14,
  },
  roiLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.green,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  roiText: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.6,
  },

  // ── Next steps ──
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  stepNum: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    lineHeight: 1.5,
  },
  stepText: {
    fontSize: 11,
    color: C.dark,
    flex: 1,
    lineHeight: 1.6,
    paddingTop: 4,
  },
  ctaBox: {
    backgroundColor: C.dark,
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 22,
    marginTop: 20,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    textAlign: 'center',
    lineHeight: 1.6,
  },
  ctaSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 6,
  },

  // ── About page (dark bg) ──
  aboutPage: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    backgroundColor: C.dark,
    paddingHorizontal: 50,
    paddingTop: 50,
    paddingBottom: 55,
  },
  aboutAM: {
    fontSize: 52,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 3,
  },
  aboutSub: {
    fontSize: 11,
    color: C.primary,
    letterSpacing: 5,
    marginBottom: 28,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 24,
  },
  aboutHeading: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    marginBottom: 12,
  },
  aboutBody: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.7,
    marginBottom: 28,
  },
  aboutContactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  aboutContactLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.30)',
    width: 70,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: 1,
  },
  aboutContactValue: {
    fontSize: 11,
    color: C.primary,
    flex: 1,
  },
  confidentialBox: {
    borderTop: `1 solid rgba(255,255,255,0.08)`,
    paddingTop: 16,
    marginTop: 40,
  },
  confidentialText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.20)',
    lineHeight: 1.5,
    textAlign: 'center',
  },

  // ── Footer (content pages) ──
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 50,
    right: 50,
    borderTop: `0.5 solid ${C.border}`,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },
  footerSite: {
    fontSize: 8,
    color: C.gray,
  },
  footerPage: {
    fontSize: 8,
    color: C.gray,
  },

  // ── About footer (light on dark) ──
  aboutFooter: {
    position: 'absolute',
    bottom: 16,
    left: 50,
    right: 50,
    borderTop: `0.5 solid rgba(255,255,255,0.10)`,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutFooterText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.25)',
  },
  aboutFooterBrand: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: 'rgba(255,255,255,0.45)',
  },
})

// ─── Helper components ───────────────────────────────────────────────────────

function PageFooter({ pageNum }: { pageNum: number }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerBrand}>AM Automations</Text>
      <Text style={s.footerSite}>amautomations.pl</Text>
      <Text style={s.footerPage}>Strona {pageNum}/7</Text>
    </View>
  )
}

function SectionHead({ title }: { title: string }) {
  return (
    <View>
      <Text style={s.sectionHeading}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  )
}

function SubHead({ title }: { title: string }) {
  return <Text style={s.subHeading}>{title}</Text>
}

// ─── Main Document ────────────────────────────────────────────────────────────

export function OfferPDFDocument({ data }: { data: OfferFormData }) {
  const today = new Date().toLocaleDateString('pl-PL', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Compute final price with discount
  const discountAmount = data.discount > 0
    ? data.discountType === '%'
      ? Math.round(data.totalPrice * data.discount / 100)
      : data.discount
    : 0
  const finalPrice = data.totalPrice - discountAmount

  // Format currency helper (no Intl – use manual format for react-pdf environment)
  const fmt = (n: number) =>
    n.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' PLN'

  // Parse next steps text into array of lines
  const nextSteps = data.nextStepsText
    .split('\n')
    .map(l => l.replace(/^[\d\.\-\•\*]+\s*/, '').trim())
    .filter(Boolean)

  const includedScope = data.scopeItems.filter(s => s.included)

  return (
    <Document
      title={`Oferta — ${data.company}`}
      author="AM Automations"
      subject={`Oferta dla ${data.company}`}
    >

      {/* ════════════════════════════════════════
          STRONA 1 — Okładka
      ════════════════════════════════════════ */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverTopBar} />

        <View style={s.coverInner}>
          {/* Logo */}
          <Text style={s.coverAM}>AM</Text>
          <Text style={s.coverBrandSub}>AUTOMATIONS</Text>

          <View style={s.coverDivider} />

          {/* Tytuł */}
          <Text style={s.coverOferta}>OFERTA</Text>

          {/* Klient */}
          <Text style={s.coverForLabel}>Przygotowana dla</Text>
          <Text style={s.coverCompany}>{data.company || 'Klient'}</Text>
          {data.clientName && (
            <Text style={s.coverContact}>
              {data.clientName}{data.position ? ` · ${data.position}` : ''}
            </Text>
          )}

          {/* Data */}
          <Text style={s.coverDate}>{today}</Text>
        </View>

        <View style={s.coverBottomBar} />
      </Page>

      {/* ════════════════════════════════════════
          STRONA 2 — Podsumowanie rozmowy
      ════════════════════════════════════════ */}
      <Page size="A4" style={s.contentPage}>
        <SectionHead title="Podsumowanie naszej rozmowy" />

        {data.conversationSummary ? (
          <Text style={s.bodyText}>{data.conversationSummary}</Text>
        ) : null}

        {data.identifiedProblem && (
          <View style={s.quoteBox}>
            <Text style={s.quoteLabel}>Zidentyfikowany problem</Text>
            <Text style={s.quoteText}>{data.identifiedProblem}</Text>
          </View>
        )}

        {data.businessImpact && (
          <>
            <SubHead title="Wpływ na biznes" />
            <View style={s.impactBox}>
              <Text style={s.bodyText}>{data.businessImpact}</Text>
            </View>
          </>
        )}

        <PageFooter pageNum={2} />
      </Page>

      {/* ════════════════════════════════════════
          STRONA 3 — Rozwiązanie
      ════════════════════════════════════════ */}
      <Page size="A4" style={s.contentPage}>
        <SectionHead title="Nasze rozwiązanie" />

        {data.projectType && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{data.projectType}</Text>
          </View>
        )}

        {data.solutionDescription && (
          <Text style={s.bodyText}>{data.solutionDescription}</Text>
        )}

        {includedScope.length > 0 && (
          <>
            <SubHead title="Co wchodzi w zakres projektu" />
            {includedScope.map((item) => (
              <View key={item.id} style={s.scopeRow}>
                <View style={s.checkBox}>
                  <Text style={s.checkMark}>✓</Text>
                </View>
                <Text style={s.scopeText}>{item.text}</Text>
              </View>
            ))}
          </>
        )}

        <PageFooter pageNum={3} />
      </Page>

      {/* ════════════════════════════════════════
          STRONA 4 — Harmonogram
      ════════════════════════════════════════ */}
      <Page size="A4" style={s.contentPage}>
        <SectionHead title="Harmonogram realizacji" />

        {data.timelineStages.map((stage) => (
          <View key={stage.id} style={s.timelineRow}>
            <View style={s.timelineWeekBadge}>
              <Text style={s.timelineWeekText}>{stage.week}</Text>
            </View>
            <Text style={s.timelineName}>{stage.name}</Text>
          </View>
        ))}

        {data.timelineStages.length > 0 && (
          <View style={s.timelineTotalBox}>
            <Text style={s.timelineTotalLabel}>Łączny czas realizacji</Text>
            <Text style={s.timelineTotalValue}>{data.timelineStages.length} tygodnie</Text>
          </View>
        )}

        <PageFooter pageNum={4} />
      </Page>

      {/* ════════════════════════════════════════
          STRONA 5 — Wycena
      ════════════════════════════════════════ */}
      <Page size="A4" style={s.contentPage}>
        <SectionHead title="Inwestycja" />

        {/* Rozbicie cenowe */}
        {data.priceBreakdown.length > 0 && (
          <>
            <View style={s.priceTableHeader}>
              <Text style={s.priceTableHeaderText}>Pozycja</Text>
              <Text style={s.priceTableHeaderText}>Kwota</Text>
            </View>
            {data.priceBreakdown.map((item, i) => (
              <View key={item.id} style={i % 2 === 0 ? s.priceRow : s.priceRowAlt}>
                <Text style={s.priceLabel}>{item.label}</Text>
                <Text style={s.priceAmount}>{fmt(item.amount)}</Text>
              </View>
            ))}
          </>
        )}

        {/* Cena finalna */}
        <View style={s.finalPriceBox}>
          <View>
            <Text style={s.finalPriceLabel}>Inwestycja całkowita</Text>
            {discountAmount > 0 && (
              <Text style={s.crossedPrice}>{fmt(data.totalPrice)}</Text>
            )}
          </View>
          <Text style={s.finalPriceValue}>{fmt(finalPrice)}</Text>
        </View>

        {/* Warunki płatności */}
        {data.paymentTerms && (
          <View style={s.paymentBox}>
            <Text style={s.paymentLabel}>Warunki płatności</Text>
            <Text style={s.paymentValue}>{data.paymentTerms}</Text>
          </View>
        )}

        {/* ROI jeśli jest business impact */}
        {data.businessImpact && (
          <View style={s.roiBox}>
            <Text style={s.roiLabel}>Kalkulacja zwrotu</Text>
            <Text style={s.roiText}>{data.businessImpact}</Text>
          </View>
        )}

        <PageFooter pageNum={5} />
      </Page>

      {/* ════════════════════════════════════════
          STRONA 6 — Następne kroki
      ════════════════════════════════════════ */}
      <Page size="A4" style={s.contentPage}>
        <SectionHead title="Jak zaczynamy?" />

        {nextSteps.map((step, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepCircle}>
              <Text style={s.stepNum}>{i + 1}</Text>
            </View>
            <Text style={s.stepText}>{step}</Text>
          </View>
        ))}

        <View style={s.ctaBox}>
          <Text style={s.ctaText}>
            Odpowiedz na tę wiadomość lub napisz na LinkedIn
          </Text>
          <Text style={s.ctaSub}>
            Startujemy w ciągu 48h od Twojej decyzji
          </Text>
        </View>

        {data.additionalNotes ? (
          <>
            <SubHead title="Dodatkowe informacje" />
            <Text style={s.bodyText}>{data.additionalNotes}</Text>
          </>
        ) : null}

        <PageFooter pageNum={6} />
      </Page>

      {/* ════════════════════════════════════════
          STRONA 7 — O nas
      ════════════════════════════════════════ */}
      <Page size="A4" style={s.aboutPage}>
        {/* Logo */}
        <Text style={s.aboutAM}>AM</Text>
        <Text style={s.aboutSub}>AUTOMATIONS</Text>

        <View style={s.aboutDivider} />

        <Text style={s.aboutHeading}>Z nami wyprzedzisz konkurencję</Text>
        <Text style={s.aboutBody}>
          AM Automations to agencja specjalizująca się w budowie stron internetowych, chatbotów AI
          i systemów automatyzacji dla małych i średnich firm. Pomagamy właścicielom biznesów
          oszczędzać czas, generować więcej leadów i obsługiwać klientów bez dodatkowych pracowników.{'\n\n'}
          Każdy projekt prowadzimy od A do Z — od projektu, przez budowę, po wdrożenie
          i szkolenie. Nie zostawiamy klientów bez wsparcia.
        </Text>

        <View style={s.aboutContactRow}>
          <Text style={s.aboutContactLabel}>WWW</Text>
          <Text style={s.aboutContactValue}>amautomations.pl</Text>
        </View>
        <View style={s.aboutContactRow}>
          <Text style={s.aboutContactLabel}>E-MAIL</Text>
          <Text style={s.aboutContactValue}>hello@amautomations.pl</Text>
        </View>
        <View style={s.aboutContactRow}>
          <Text style={s.aboutContactLabel}>LINKEDIN</Text>
          <Text style={s.aboutContactValue}>linkedin.com/in/amautomations</Text>
        </View>
        <View style={s.aboutContactRow}>
          <Text style={s.aboutContactLabel}>INSTAGRAM</Text>
          <Text style={s.aboutContactValue}>@amautomations</Text>
        </View>

        <View style={s.confidentialBox}>
          <Text style={s.confidentialText}>
            Dokument poufny. Przygotowany wyłącznie dla {data.company || 'Klienta'}.{'\n'}
            Wszelkie informacje zawarte w tej ofercie są przeznaczone wyłącznie dla adresata
            i nie mogą być udostępniane osobom trzecim bez zgody AM Automations.
          </Text>
        </View>

        {/* About footer */}
        <View style={s.aboutFooter}>
          <Text style={s.aboutFooterBrand}>AM Automations</Text>
          <Text style={s.aboutFooterText}>amautomations.pl</Text>
          <Text style={s.aboutFooterText}>Strona 7/7</Text>
        </View>
      </Page>

    </Document>
  )
}
