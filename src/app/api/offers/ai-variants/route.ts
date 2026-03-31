import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'


export async function POST(req: NextRequest) {
  try {
    const {
      diagnosis_notes,
      project_type,
      segment,
      suggested_price_min,
      suggested_price_max,
    } = await req.json() as {
      diagnosis_notes?: string
      project_type?: string
      segment?: string
      suggested_price_min?: number
      suggested_price_max?: number
    }

    const priceRange = suggested_price_min && suggested_price_max
      ? `${suggested_price_min}–${suggested_price_max} PLN`
      : suggested_price_max
        ? `do ${suggested_price_max} PLN`
        : '5000–15000 PLN'

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Jesteś ekspertem sprzedażowym AM Automations. Odpowiadasz WYŁĄCZNIE w JSON, bez dodatkowego tekstu.',
        },
        {
          role: 'user',
          content: `Na podstawie danych z diagnozy klienta przygotuj 3 warianty cenowe oferty.
Projekt: ${project_type ?? 'Web/AI'}. Segment: ${segment ?? 'ogólny'}. Widelki cenowe: ${priceRange}.
Diagnoza: ${diagnosis_notes ?? 'Brak notatek'}

Zasady wyceny:
- Basic = 60-70% górnej granicy przedziału
- Standard = 85-100% (rekomendowany, najbardziej dopasowany)
- Pro = 110-130% (rozszerzony zakres, premium)

Wygeneruj JSON:
{
  "variants": [
    {
      "name": "Basic",
      "price": liczba,
      "features": ["feature 1", "feature 2", "feature 3"],
      "is_recommended": false,
      "ai_match_reason": ""
    },
    {
      "name": "Standard",
      "price": liczba,
      "features": ["wszystkie z Basic", "feature dodatkowy 1", "feature dodatkowy 2", "feature dodatkowy 3"],
      "is_recommended": true,
      "ai_match_reason": "Najlepiej dopasowany, ponieważ..."
    },
    {
      "name": "Pro",
      "price": liczba,
      "features": ["wszystkie z Standard", "feature premium 1", "feature premium 2", "feature premium 3", "support 3 miesiące"],
      "is_recommended": false,
      "ai_match_reason": ""
    }
  ]
}
Pisz po polsku. Ceny bez groszy (całe liczby).`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 1000,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[ai-variants]', err)
    return NextResponse.json({ error: 'Błąd generowania wariantów' }, { status: 500 })
  }
}
