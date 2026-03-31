import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'
import { createClient } from '@/lib/supabase/server'


const SYSTEM_PROMPT = `Jesteś architektem rozwiązań w AM Automations — polskiej agencji web i automatyzacji.
Na podstawie notatek z rozmowy diagnostycznej dobierz optymalny projekt i wycenę.

Cennik AM Automations:
- Landing page: 1500-3000 PLN, 1-2 tygodnie
- Strona z konwersją (5-10 podstron): 2000-5000 PLN, 2-4 tygodnie
- Chatbot AI / automatyzacja kontaktu: 3000-8000 PLN, 2-4 tygodnie
- System wewnętrzny zamiast Excela: 8000-25000 PLN, 6-12 tygodni
- Aplikacja webowa: 10000-30000 PLN, 8-16 tygodni

Odpowiedz WYŁĄCZNIE prawidłowym JSON:
{
  "problem_summary": "Zwięzłe podsumowanie problemu klienta (1-2 zdania)",
  "recommended_project_type": "strona | system | aplikacja | chatbot | landing",
  "recommended_scope": ["Element zakresu 1", "Element 2", "Element 3", "Element 4"],
  "price_range_min": 3000,
  "price_range_max": 6000,
  "estimated_time": "3-4 tygodnie",
  "key_selling_points": [
    "Korzyść biznesowa 1 (konkretna, mierzalna)",
    "Korzyść 2",
    "Korzyść 3"
  ],
  "roi_calculation": "Klient traci [X] godzin/tydzień na [Y]. Przy stawce [Z] PLN/h roczny koszt = [W] PLN. Inwestycja [cena] PLN zwraca się w [N] miesięcy."
}`

export async function POST(req: NextRequest) {
  try {
    const { leadId, dealId, diagnosisNotes, clientProblem } = (await req.json()) as {
      leadId: string
      dealId?: string
      diagnosisNotes?: string
      clientProblem?: string
    }

    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

    const supabase = await createClient()

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
    let deal: Record<string, unknown> | null = null
    if (dealId) {
      const { data } = await supabase.from('deals').select('*').eq('id', dealId).single()
      deal = data
    }

    const ctx = [
      lead && `Firma: ${lead.company}`,
      lead?.segment   && `Segment: ${lead.segment}`,
      lead?.industry  && `Branża: ${lead.industry}`,
      lead?.ai_problem && `AI problem: ${lead.ai_problem}`,
      lead?.buying_signal && `Sygnał zakupowy: ${lead.buying_signal}`,
      clientProblem   && `Problem klienta: ${clientProblem}`,
      diagnosisNotes  && `Notatki z diagnozy:\n${diagnosisNotes}`,
      deal?.suggested_solution && `Wstępna idea rozwiązania: ${deal.suggested_solution}`,
    ].filter(Boolean).join('\n\n')

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Dobierz projekt na podstawie diagnozy:\n\n${ctx}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 700,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[match-offer]', err)
    return NextResponse.json({ error: 'Failed to match offer' }, { status: 500 })
  }
}
