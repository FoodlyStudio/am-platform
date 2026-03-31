import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'


const ENGAGEMENT_POINTS: Record<string, number> = {
  view:          15,
  section_price: 20,
  slider:        15,
  roi_calc:      25,
  hot_lead:      30,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      slug: string
      event_type: 'view' | 'section' | 'slider' | 'roi_calc' | 'time'
      data?: Record<string, unknown>
    }

    const { slug, event_type, data = {} } = body
    if (!slug) return NextResponse.json({ ok: false }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    // Get offer page
    const { data: offerPage } = await getSupabaseAdmin()
      .from('offer_pages')
      .select('id, deal_id, view_count')
      .eq('public_slug', slug)
      .single()

    if (!offerPage) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

    const offerPageId = offerPage.id
    const dealId = offerPage.deal_id

    // ── Handle each event type ──────────────────────────────────────────────

    if (event_type === 'view') {
      // Get or create view record for this session
      const { data: existing } = await getSupabaseAdmin()
        .from('offer_page_views')
        .select('id, duration_seconds')
        .eq('offer_page_id', offerPageId)
        .eq('ip_address', ip)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!existing) {
        await getSupabaseAdmin().from('offer_page_views').insert({
          offer_page_id: offerPageId,
          ip_address: ip,
          user_agent: req.headers.get('user-agent') ?? null,
          duration_seconds: 0,
          sections_viewed: [],
          slider_interactions: 0,
          roi_calculator_used: false,
          pricing_variant_viewed: data.variant ?? null,
        })
      }

      // Increment view_count on offer_pages
      await getSupabaseAdmin()
        .from('offer_pages')
        .update({
          view_count: (offerPage.view_count ?? 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', offerPageId)

      // Check hot lead: 3+ views in last hour from same IP
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await getSupabaseAdmin()
        .from('offer_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('offer_page_id', offerPageId)
        .eq('ip_address', ip)
        .gte('created_at', oneHourAgo)

      if ((count ?? 0) >= 3 && dealId) {
        await Promise.all([
          getSupabaseAdmin().from('deals').update({
            is_hot: true,
            hot_reason: 'Sprawdza ofertę wielokrotnie',
            engagement_score: await incrementEngagement(dealId, ENGAGEMENT_POINTS.hot_lead),
          }).eq('id', dealId),
          getSupabaseAdmin().from('notifications').insert({
            deal_id: dealId,
            type: 'hot_lead',
            title: 'Gorący lead!',
            message: `Klient otworzył ofertę ${count} razy w ciągu ostatniej godziny`,
            priority: 'urgent',
            is_read: false,
          }),
        ])
      }

      // Engagement: view
      if (dealId) {
        await incrementEngagement(dealId, ENGAGEMENT_POINTS.view)
      }
    }

    if (event_type === 'section') {
      const section = (data.section as string) ?? ''
      // Append section to sections_viewed for the latest view
      const { data: view } = await getSupabaseAdmin()
        .from('offer_page_views')
        .select('id, sections_viewed')
        .eq('offer_page_id', offerPageId)
        .eq('ip_address', ip)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (view) {
        const prev: string[] = Array.isArray(view.sections_viewed) ? view.sections_viewed : []
        if (!prev.includes(section)) {
          await getSupabaseAdmin()
            .from('offer_page_views')
            .update({ sections_viewed: [...prev, section] })
            .eq('id', view.id)

          // Pricing section = bonus engagement
          if (section === 'pricing' && dealId) {
            await incrementEngagement(dealId, ENGAGEMENT_POINTS.section_price)
          }
        }
      }

      // Update offer_pages sections_viewed
      const { data: op } = await getSupabaseAdmin()
        .from('offer_pages')
        .select('sections_viewed')
        .eq('id', offerPageId)
        .single()
      const prevSections = (op?.sections_viewed ?? {}) as Record<string, number>
      prevSections[section] = (prevSections[section] ?? 0) + 1
      await getSupabaseAdmin().from('offer_pages').update({ sections_viewed: prevSections }).eq('id', offerPageId)
    }

    if (event_type === 'slider') {
      const { data: view } = await getSupabaseAdmin()
        .from('offer_page_views')
        .select('id, slider_interactions')
        .eq('offer_page_id', offerPageId)
        .eq('ip_address', ip)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (view) {
        await getSupabaseAdmin()
          .from('offer_page_views')
          .update({ slider_interactions: (view.slider_interactions ?? 0) + 1 })
          .eq('id', view.id)
      }

      if (dealId) await incrementEngagement(dealId, ENGAGEMENT_POINTS.slider)
    }

    if (event_type === 'roi_calc') {
      const { data: view } = await getSupabaseAdmin()
        .from('offer_page_views')
        .select('id')
        .eq('offer_page_id', offerPageId)
        .eq('ip_address', ip)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (view) {
        await getSupabaseAdmin()
          .from('offer_page_views')
          .update({ roi_calculator_used: true })
          .eq('id', view.id)
      }

      if (dealId) await incrementEngagement(dealId, ENGAGEMENT_POINTS.roi_calc)
    }

    if (event_type === 'time') {
      const seconds = Number(data.seconds ?? 0)
      const { data: view } = await getSupabaseAdmin()
        .from('offer_page_views')
        .select('id')
        .eq('offer_page_id', offerPageId)
        .eq('ip_address', ip)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (view) {
        await getSupabaseAdmin()
          .from('offer_page_views')
          .update({ duration_seconds: seconds })
          .eq('id', view.id)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[track]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

async function incrementEngagement(dealId: string, points: number): Promise<number> {
  const { data } = await getSupabaseAdmin()
    .from('deals')
    .select('engagement_score')
    .eq('id', dealId)
    .single()
  const current = Number(data?.engagement_score ?? 0)
  const next = Math.min(100, current + points)
  await getSupabaseAdmin().from('deals').update({ engagement_score: next }).eq('id', dealId)
  return next
}
