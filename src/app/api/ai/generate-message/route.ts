import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Per-stage instructions ───────────────────────────────────────────────────

const STAGE_INSTRUCTIONS: Record<string, string> = {
  connection_request:
    'Napisz krótką notatkę do zaproszenia LinkedIn (MAKSYMALNIE 280 znaków). Jeden konkretny powód nawiązania kontaktu, bez sprzedawania.',
  dm1_icebreaker:
    'Napisz pierwszą DM po zaakceptowaniu zaproszenia. Max 80 słów. Zacznij od spersonalizowanego icebreakera nawiązującego do sygnału zakupowego firmy. Zakończ JEDNYM pytaniem diagnostycznym.',
  fu1_case_study:
    'Napisz follow-up z dowodem społecznym. Max 70 słów. Podaj konkretny wynik dla podobnej firmy (możesz wymyślić realistyczne liczby). Zadaj jedno pytanie.',
  fu2_calendar:
    'Napisz ostatni follow-up z linkiem do kalendarza. Max 60 słów. Bez presji — to ostatnia wiadomość. Link do kalendarza: https://cal.com/am-automations/discovery',
  post_offer_48h:
    'Napisz follow-up 48h po wysłaniu oferty. Max 50 słów. Sprawdź czy dotarła, czy są pytania. Bez presji.',
  post_offer_5d:
    'Napisz follow-up 5 dni po ofercie. Max 60 słów. Zaproponuj alternatywę (mniejszy zakres / etapy płatności) jeśli budżet jest problemem.',
  post_offer_14d:
    'Napisz ostatni follow-up po 14 dniach. Max 50 słów. Zamknij wątek bez urazy. Zostaw otwarte drzwi.',
  reengagement_90d:
    'Napisz wiadomość re-engagement po 90 dniach. Max 80 słów. Nawiąż do poprzedniej rozmowy. Wspomnij o nowym projekcie lub trendzie branżowym. Zapytaj czy coś się zmieniło.',
}

const SYSTEM_PROMPT = `Jesteś ekspertem od outreach B2B dla AM Automations — polskiej agencji web i automatyzacji.

Co sprzedajemy:
- Strony z konwersją (2000-5000 PLN)
- Chatboty AI i automatyzacje (3000-8000 PLN)
- Systemy wewnętrzne zamiast Exceli (8000-25000 PLN)

Zasady pisania wiadomości:
- Język: naturalny, ludzki, po polsku
- NIE używaj buzzwordów: "synergia", "innowacja", "rozwiązanie", "propozycja wartości"
- Bądź konkretny — nawiązuj do DANYCH firmy, nie pisz generycznie
- Krótkie akapity (1-2 zdania), format LinkedIn
- Pierwsze wiadomości: bez emotikon
- Follow-upy: nie pytaj "czy widziałeś moją poprzednią wiadomość"
- Zwróć WYŁĄCZNIE treść wiadomości — bez cudzysłowów, nagłówków, komentarzy`

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { leadId, dealId, messageType } = (await req.json()) as {
      leadId: string
      dealId?: string
      messageType: string
    }

    if (!leadId || !messageType) {
      return NextResponse.json({ error: 'leadId and messageType are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Fetch deal if provided
    let deal: Record<string, unknown> | null = null
    if (dealId) {
      const { data } = await supabase.from('deals').select('*').eq('id', dealId).single()
      deal = data
    }

    // Fetch recent message history for context
    const { data: history } = await supabase
      .from('outreach_messages')
      .select('message_type, message_content, status, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Build lead context
    const leadCtx = [
      `Imię: ${lead.first_name}`,
      `Firma: ${lead.company}`,
      lead.position && `Stanowisko: ${lead.position}`,
      lead.segment && `Segment: ${lead.segment}`,
      lead.industry && `Branża: ${lead.industry}`,
      lead.ai_score != null && `AI Score: ${lead.ai_score}/10`,
      lead.ai_problem && `Zidentyfikowany problem: ${lead.ai_problem}`,
      lead.buying_signal && `Sygnał zakupowy: ${lead.buying_signal}`,
      lead.website_analysis && `Analiza strony: ${String(lead.website_analysis).slice(0, 300)}`,
      deal?.client_problem && `Problem klienta (z diagnozy): ${deal.client_problem}`,
    ]
      .filter(Boolean)
      .join('\n')

    const historyCtx = history?.length
      ? '\n\nHistoria wiadomości (najnowsze):\n' +
        history
          .map(
            (m) =>
              `[${m.message_type} | ${m.status}]: ${String(m.message_content).slice(0, 120)}`,
          )
          .join('\n')
      : ''

    const instruction =
      STAGE_INSTRUCTIONS[messageType] ??
      'Napisz spersonalizowaną wiadomość LinkedIn nawiązującą do kontekstu firmy.'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Typ wiadomości: ${messageType}
Instrukcja: ${instruction}

Dane kontaktu:
${leadCtx}${historyCtx}`,
        },
      ],
      temperature: 0.85,
      max_tokens: 350,
    })

    const message = completion.choices[0]?.message?.content?.trim() ?? ''
    return NextResponse.json({ message })
  } catch (err) {
    console.error('[generate-message]', err)
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 })
  }
}
