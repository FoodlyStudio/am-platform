import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, format } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { slug, variant_name, client_confirmation_name } = await req.json() as {
      slug: string
      variant_name: string
      client_confirmation_name: string
    }

    if (!slug || !variant_name || !client_confirmation_name?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get offer page
    const { data: offerPage } = await supabase
      .from('offer_pages')
      .select('id, deal_id, pricing_variants, accepted_at, start_date, expires_at, is_active')
      .eq('public_slug', slug)
      .single()

    if (!offerPage) return NextResponse.json({ error: 'Oferta nie istnieje' }, { status: 404 })
    if (offerPage.accepted_at) return NextResponse.json({ error: 'Oferta już zaakceptowana' }, { status: 409 })
    if (offerPage.expires_at && new Date(offerPage.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Oferta wygasła' }, { status: 410 })
    }
    if (offerPage.is_active === false) {
      return NextResponse.json({ error: 'Oferta nieaktywna' }, { status: 410 })
    }

    // Find the variant
    const variants = (offerPage.pricing_variants ?? []) as Array<{
      name: string; price: number; features: string[]; is_recommended: boolean
    }>
    const variant = variants.find(v => v.name === variant_name) ?? variants[0]
    if (!variant) return NextResponse.json({ error: 'Wariant nie istnieje' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const now = new Date().toISOString()
    const dueDate = format(addDays(new Date(), 7), 'yyyy-MM-dd')
    const dealId = offerPage.deal_id

    // Get deal + lead for client name
    const { data: deal } = await supabase
      .from('deals')
      .select('*, lead:leads(first_name, last_name, company)')
      .eq('id', dealId)
      .single()

    const clientName = deal?.lead
      ? `${deal.lead.first_name} ${deal.lead.last_name}`.trim()
      : client_confirmation_name

    const startDate = offerPage.start_date ?? format(addDays(new Date(), 7), 'yyyy-MM-dd')

    await Promise.all([
      // Update offer_pages
      supabase.from('offer_pages').update({
        accepted_at: now,
        accepted_variant: variant_name,
        accepted_ip: ip,
      }).eq('id', offerPage.id),

      // Update deal → wygrana
      supabase.from('deals').update({
        stage: 'wygrana',
        won_at: now,
        value: variant.price,
      }).eq('id', dealId),

      // Insert income (50% deposit)
      supabase.from('income').insert({
        deal_id: dealId,
        client_name: clientName,
        project_name: deal?.title ?? variant_name,
        amount: Math.round(variant.price * 0.5),
        currency: 'PLN',
        payment_type: 'zaliczka',
        status: 'oczekujaca',
        due_date: dueDate,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        project_type: deal?.project_type ?? null,
      }),

      // Insert notification
      supabase.from('notifications').insert({
        deal_id: dealId,
        type: 'offer_accepted',
        title: 'Klient zaakceptował ofertę!',
        message: `${clientName} wybrał wariant "${variant_name}" — ${variant.price.toLocaleString('pl-PL')} PLN. Projekt rusza ${startDate}.`,
        priority: 'urgent',
        is_read: false,
        push_sent: false,
      }),
    ])

    return NextResponse.json({
      ok: true,
      start_date: startDate,
      variant_name,
      price: variant.price,
    })
  } catch (err) {
    console.error('[accept]', err)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
