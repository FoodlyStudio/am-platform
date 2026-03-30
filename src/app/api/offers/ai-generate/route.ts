import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Jesteś ekspertem sprzedażowym firmy AM Automations — polskiej agencji web i automatyzacji AI.
Sprzedajemy: strony www z konwersją (2-5k PLN), chatboty AI (3-8k PLN), systemy wewnętrzne (8-25k PLN).
Klienci: właściciele małych firm (gabinety medyczne, kancelarie, beauty, budowlanka, szkolenia).

Ton: premium, technologiczny, bezpośredni. Bez lania wody. Każde zdanie niesie wartość.
Nie używaj emotikon. Pisz po polsku. Odpowiedz WYŁĄCZNIE w JSON, bez żadnego dodatkowego tekstu.`

export async function POST(req: NextRequest) {
  try {
    const {
      diagnosis_notes,
      client_name,
      company,
      segment,
    } = (await req.json()) as {
      diagnosis_notes: string
      client_name?: string
      company?: string
      segment?: string
    }

    if (!diagnosis_notes?.trim()) {
      return NextResponse.json({ error: 'diagnosis_notes is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Jesteś ekspertem sprzedażowym firmy AM Automations. Na podstawie notatek z rozmowy diagnostycznej z klientem, przygotuj treści do oferty.

Notatki z rozmowy:
${diagnosis_notes}

Klient: ${client_name ?? 'nieznany'}, ${company ?? 'firma nieznana'}, segment: ${segment ?? 'ogólny'}

Wygeneruj JSON z polami:
{
  "conversation_summary": "2-3 zdania podsumowujące rozmowę, w tonie profesjonalnym, bezpośrednim. Zacznij od: Na naszym spotkaniu opowiedziałeś/aś o...",
  "identified_problem": "1-2 zdania precyzyjnie opisujące problem klienta. Konkretnie, bez ogólników.",
  "business_impact": "2-3 zdania opisujące finansowy/operacyjny wpływ problemu. Użyj konkretnych szacunków jeśli możliwe.",
  "solution_description": "2-3 zdania opisujące proponowane rozwiązanie. Co dokładnie zbudujemy i jak to rozwiąże problem.",
  "scope_items": ["punkt 1 zakresu", "punkt 2", "punkt 3", "punkt 4", "punkt 5"],
  "timeline_weeks": 4,
  "key_benefits": ["korzyść 1", "korzyść 2", "korzyść 3"],
  "roi_note": "1 zdanie o zwrocie z inwestycji, np. Przy X zapytaniach tygodniowo i średniej wartości klienta Y PLN, inwestycja zwróci się w Z miesiące."
}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1200,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[ai-generate-offer]', err)
    return NextResponse.json({ error: 'Błąd generowania treści AI' }, { status: 500 })
  }
}
