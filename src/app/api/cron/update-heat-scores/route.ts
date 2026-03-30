import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Vercel cron: every 15 minutes
// Updates heat_score for deals based on recent offer_tracking_events
export async function GET() {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Get recent tracking events grouped by deal
    const { data: events } = await supabaseAdmin
      .from('offer_tracking_events')
      .select('deal_id, event_type, created_at')
      .gte('created_at', cutoff)

    if (!events?.length) {
      return NextResponse.json({ updated: 0 })
    }

    // Calculate scores per deal
    const POINTS: Record<string, number> = {
      view: 10,
      section: 5,
      slider: 8,
      roi_calc: 15,
      pdf_view: 10,
    }

    const dealScores: Record<string, number> = {}
    for (const e of events) {
      if (!e.deal_id) continue
      dealScores[e.deal_id] = (dealScores[e.deal_id] ?? 0) + (POINTS[e.event_type] ?? 5)
    }

    // Update each deal
    let updated = 0
    for (const [dealId, score] of Object.entries(dealScores)) {
      const cappedScore = Math.min(score, 100)
      const isHot = cappedScore >= 50

      await supabaseAdmin
        .from('deals')
        .update({
          heat_score: cappedScore,
          is_hot: isHot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId)

      updated++
    }

    return NextResponse.json({ updated, message: 'Heat scores updated' })
  } catch (err) {
    console.error('[cron/update-heat-scores]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
