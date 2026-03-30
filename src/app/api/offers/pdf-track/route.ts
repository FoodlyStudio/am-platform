import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { deal_id, pages_viewed, duration_seconds } = await req.json() as {
      deal_id: string
      pages_viewed?: number[]
      duration_seconds?: number
    }

    if (!deal_id) return NextResponse.json({ ok: false }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const isPricingViewed = Array.isArray(pages_viewed) && pages_viewed.includes(5)

    // Insert PDF view record
    await supabase.from('offer_pdf_views').insert({
      deal_id,
      pages_viewed: pages_viewed ?? [],
      is_pricing_page_viewed: isPricingViewed,
      duration_seconds: duration_seconds ?? 0,
      ip_address: ip,
    })

    // Engagement points: PDF view = +10
    const { data: deal } = await supabase
      .from('deals')
      .select('engagement_score')
      .eq('id', deal_id)
      .single()

    const current = Number(deal?.engagement_score ?? 0)
    let points = 10
    if (isPricingViewed) points += 20  // Viewed pricing page

    const next = Math.min(100, current + points)
    await supabase.from('deals').update({ engagement_score: next }).eq('id', deal_id)

    if (isPricingViewed) {
      await supabase.from('notifications').insert({
        deal_id,
        type: 'pricing_viewed',
        title: 'Klient przejrzał sekcję wyceny w PDF',
        message: 'Klient dotarł do strony 5 (Inwestycja) w ofercie PDF',
        priority: 'high',
        is_read: false,
      })
    }

    // Hot lead check: 3+ PDF views in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('offer_pdf_views')
      .select('*', { count: 'exact', head: true })
      .eq('deal_id', deal_id)
      .gte('created_at', oneHourAgo)

    if ((count ?? 0) >= 3) {
      await Promise.all([
        supabase.from('deals').update({
          is_hot: true,
          hot_reason: 'Sprawdza PDF oferty wielokrotnie',
        }).eq('id', deal_id),
        supabase.from('notifications').insert({
          deal_id,
          type: 'hot_lead',
          title: 'Gorący lead — wielokrotnie otwiera PDF!',
          message: `Klient otworzył PDF ${count} razy w ciągu ostatniej godziny`,
          priority: 'urgent',
          is_read: false,
        }),
      ])
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[pdf-track]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
