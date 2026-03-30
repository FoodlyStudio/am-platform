import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Vercel cron: 6:00 AM every day
// Creates daily notifications for each user about their outreach tasks
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get all users
    const { data: users } = await supabaseAdmin
      .from('user_profiles')
      .select('id')

    if (!users?.length) return NextResponse.json({ ok: true })

    for (const user of users) {
      // Count today's tasks
      const { count: leadCount } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'qualified')
        .gte('ai_score', 5)

      if (leadCount && leadCount > 0) {
        await supabaseAdmin.from('notifications').insert({
          user_id: user.id,
          type: 'daily_tasks',
          title: `Dzisiejsze zadania: ${leadCount} leadów do kontaktu`,
          body: 'Otwórz Outreach Queue żeby zobaczyć kolejkę.',
          priority: 'normal',
          is_read: false,
        })
      }

      // Check reengagement dates
      const { data: reengagements } = await supabaseAdmin
        .from('deals')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('reengagement_date', today)

      if (reengagements?.length) {
        await supabaseAdmin.from('notifications').insert({
          user_id: user.id,
          type: 'reengagement',
          title: `${reengagements.length} deal${reengagements.length > 1 ? 'i' : ''} do re-engagement dziś`,
          body: reengagements.map((d) => d.title).join(', '),
          priority: 'high',
          is_read: false,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cron/daily-queue]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
