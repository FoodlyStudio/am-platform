import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Vercel cron: 6:00 AM every day
// Checks for overdue offer follow-ups and creates notifications
export async function GET() {
  try {
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

    // Get deals with offers sent and no recent follow-up
    const { data: deals } = await supabaseAdmin
      .from('deals')
      .select('id, title, user_id, offer_sent_at')
      .eq('stage', 'oferta_prezentowana')
      .not('offer_sent_at', 'is', null)

    if (!deals?.length) return NextResponse.json({ ok: true })

    let notifCount = 0

    for (const deal of deals) {
      const sentAt = deal.offer_sent_at
      if (!sentAt) continue

      let followupType: string | null = null
      let urgency: 'normal' | 'high' = 'normal'

      if (sentAt <= fourteenDaysAgo) {
        followupType = '14 dni'
        urgency = 'high'
      } else if (sentAt <= fiveDaysAgo) {
        followupType = '5 dni'
        urgency = 'high'
      } else if (sentAt <= twoDaysAgo) {
        followupType = '48h'
        urgency = 'normal'
      }

      if (followupType) {
        // Check if notification already sent today
        const today = now.toISOString().split('T')[0]
        const { count } = await supabaseAdmin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('deal_id', deal.id)
          .eq('type', 'offer_followup')
          .gte('created_at', today)

        if (!count || count === 0) {
          await supabaseAdmin.from('notifications').insert({
            user_id: deal.user_id,
            deal_id: deal.id,
            type: 'offer_followup',
            title: `Follow-up ${followupType}: ${deal.title}`,
            body: `Oferta czeka ${followupType} bez odpowiedzi. Czas na kontakt.`,
            priority: urgency,
            is_read: false,
          })
          notifCount++
        }
      }
    }

    return NextResponse.json({ ok: true, notificationsCreated: notifCount })
  } catch (err) {
    console.error('[cron/follow-up-check]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
