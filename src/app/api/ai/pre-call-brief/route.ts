import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Jesteś doświadczonym konsultantem sprzedaży B2B dla AM Automations.
Przygotowujesz pre-call brief przed rozmową z potencjalnym klientem.

AM Automations sprzedaje firmom usługowym w Polsce:
- Strony z konwersją (2000-5000 PLN)
- Chatboty AI i automatyzacje (3000-8000 PLN)
- Systemy wewnętrzne zamiast Exceli (8000-25000 PLN)

Odpowiedz WYŁĄCZNIE prawidłowym JSON (bez markdown, bez cudzysłowów obejmujących JSON):
{
  "company_overview": "Podsumowanie firmy i jej sytuacji rynkowej (2-3 zdania)",
  "buying_signals": ["sygnał 1", "sygnał 2", "sygnał 3"],
  "suggested_questions": [
    "Pytanie diagnostyczne 1?",
    "Pytanie 2?",
    "Pytanie 3?",
    "Pytanie 4?",
    "Pytanie 5?"
  ],
  "potential_solutions": ["Rozwiązanie pasujące do segmentu 1", "Rozwiązanie 2"],
  "what_to_avoid": ["Czego unikać na tej rozmowie 1", "Czego unikać 2"],
  "opening_hook": "Jedno spersonalizowane zdanie otwierające rozmowę — konkretne, nie generyczne"
}`

export async function POST(req: NextRequest) {
  try {
    const { leadId, dealId } = (await req.json()) as { leadId: string; dealId?: string }
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

    const supabase = await createClient()

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    let deal: Record<string, unknown> | null = null
    if (dealId) {
      const { data } = await supabase.from('deals').select('*').eq('id', dealId).single()
      deal = data
    }

    const { data: messages } = await supabase
      .from('outreach_messages')
      .select('message_type, status, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5)

    const ctx = [
      `Imię i nazwisko: ${lead.first_name} ${lead.last_name}`,
      `Firma: ${lead.company}`,
      lead.position       && `Stanowisko: ${lead.position}`,
      lead.industry       && `Branża: ${lead.industry}`,
      lead.segment        && `Segment: ${lead.segment}`,
      lead.ai_score       != null && `AI Score kwalifikacji: ${lead.ai_score}/10`,
      lead.ai_problem     && `Zidentyfikowany problem: ${lead.ai_problem}`,
      lead.buying_signal  && `Sygnał zakupowy: ${lead.buying_signal}`,
      lead.website_analysis && `Analiza strony: ${String(lead.website_analysis).slice(0, 400)}`,
      lead.company_website && `Strona firmy: ${lead.company_website}`,
      deal?.client_problem     && `Problem z diagnozy: ${deal.client_problem}`,
      deal?.diagnosis_notes    && `Notatki z diagnozy: ${String(deal.diagnosis_notes).slice(0, 300)}`,
      messages?.length && `Historia outreachu: ${messages.map((m) => `${m.message_type} (${m.status})`).join(', ')}`,
    ].filter(Boolean).join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Przygotuj pre-call brief dla:\n\n${ctx}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 800,
    })

    const brief = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ brief })
  } catch (err) {
    console.error('[pre-call-brief]', err)
    return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 })
  }
}
