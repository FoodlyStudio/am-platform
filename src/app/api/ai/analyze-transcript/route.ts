import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { transcript, deal_id, lead_context } = await req.json() as {
      transcript: string
      deal_id?: string
      lead_context?: string
    }

    if (!transcript?.trim()) {
      return NextResponse.json({ error: 'Brak transkrypcji' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Jesteś ekspertem od analizy rozmów sprzedażowych AM Automations.
Szukasz: pain pointów (tracę, marnujemy, nie działa, frustruje), sygnałów zakupowych (chcemy, potrzebujemy, ile kosztuje, planujemy), obiekcji (za drogo, nie teraz, mam już).
Cytuj DOKŁADNE słowa klienta. Odpowiadasz WYŁĄCZNIE w JSON, bez dodatkowego tekstu.`,
        },
        {
          role: 'user',
          content: `Przeanalizuj transkrypcję rozmowy diagnostycznej.
${lead_context ? `Kontekst klienta: ${lead_context}\n` : ''}
Transkrypcja:
${transcript}

Wygeneruj JSON:
{
  "summary": "3-5 zdań podsumowania rozmowy",
  "pain_points": [
    {"pain_point": "opis problemu", "severity": "high|medium|low", "quote": "dokładny cytat klienta lub null"}
  ],
  "buying_signals": [
    {"signal": "opis sygnału", "confidence": "high|medium|low"}
  ],
  "objections": [
    {"objection": "treść obiekcji", "context": "kontekst w jakiej padła"}
  ],
  "next_steps": "sugerowane następne kroki dla handlowca (1-2 zdania)",
  "sentiment": "very_positive|positive|neutral|negative|very_negative",
  "deal_probability": liczba_1_100,
  "diagnosis_for_deal": {
    "client_problem": "1-2 zdania konkretnego opisu problemu",
    "suggested_solution": "1-2 zdania propozycji rozwiązania",
    "diagnosis_notes": "3-5 zdań szczegółowych notatek z rozmowy"
  }
}
Pisz po polsku.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ result, deal_id })
  } catch (err) {
    console.error('[analyze-transcript]', err)
    return NextResponse.json({ error: 'Błąd analizy transkrypcji' }, { status: 500 })
  }
}
