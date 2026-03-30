import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Jesteś ekspertem od sprzedaży B2B dla AM Automations.
Klient wyraził obiekcję w trakcie negocjacji. Zaproponuj 2-3 konkretne odpowiedzi.

AM Automations sprzedaje:
- Strony z konwersją (2000-5000 PLN)
- Chatboty AI i automatyzacje (3000-8000 PLN)
- Systemy wewnętrzne (8000-25000 PLN)

Typy obiekcji: price (za drogo), timing (nie teraz), competition (mam kogoś), trust (nie znam was), need (nie potrzebuję), other

Każda odpowiedź powinna być:
- Naturalna, nie "sprzedażowa"
- Konkretna i oparta na faktach
- Max 50 słów

Odpowiedz WYŁĄCZNIE prawidłowym JSON:
{
  "objection_type": "price | timing | competition | trust | need | other",
  "responses": [
    {
      "approach": "Nazwa techniki (np. Reframe wartości, ROI, Dowód społeczny)",
      "text": "Treść odpowiedzi — konkretna, gotowa do użycia"
    },
    {
      "approach": "Nazwa techniki 2",
      "text": "Treść odpowiedzi 2"
    },
    {
      "approach": "Nazwa techniki 3",
      "text": "Treść odpowiedzi 3"
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const { objectionText, leadId, dealId } = (await req.json()) as {
      objectionText: string
      leadId?: string
      dealId?: string
    }

    if (!objectionText?.trim()) {
      return NextResponse.json({ error: 'objectionText required' }, { status: 400 })
    }

    const supabase = await createClient()

    let dealCtx = ''
    if (leadId) {
      const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
      if (lead) {
        dealCtx += `Firma: ${lead.company}\nSegment: ${lead.segment ?? '—'}\nAI Score: ${lead.ai_score ?? '—'}/10\n`
      }
    }
    if (dealId) {
      const { data: deal } = await supabase.from('deals').select('*').eq('id', dealId).single()
      if (deal) {
        dealCtx += `Wartość deala: ${deal.value ?? '?'} PLN\nTyp projektu: ${deal.project_type ?? '—'}\n`
        dealCtx += deal.client_problem ? `Problem klienta: ${deal.client_problem}\n` : ''
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Obiekcja klienta: "${objectionText}"\n\nKontekst deala:\n${dealCtx || 'Brak dodatkowego kontekstu'}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.75,
      max_tokens: 600,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[handle-objection]', err)
    return NextResponse.json({ error: 'Failed to handle objection' }, { status: 500 })
  }
}
