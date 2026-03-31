import { NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'


const SYSTEM_PROMPT = `Zaproponuj 5 tematów contentowych dla AM Automations (agencja web i automatyzacji AI w Polsce).
Klienci: właściciele małych firm (gabinety medyczne, kancelarie, beauty, budowlanka, szkolenia).

Tematy powinny być:
- Aktualne (AI, automatyzacja, efektywność biznesowa)
- Adresować realne problemy klientów (brak czasu, ręczne procesy, brak leadów)
- Angażujące na social media
- Różnorodne (nie wszystkie o tym samym)

Odpowiedz WYŁĄCZNIE prawidłowym JSON:
{
  "topics": [
    {
      "title": "Tytuł/temat (konkretny, max 60 znaków)",
      "format": "carousel|linkedin|repurpose",
      "why": "1 zdanie dlaczego ten temat zadziała teraz",
      "hook": "Propozycja hooka (pierwsze zdanie posta)"
    }
  ]
}`

export async function GET() {
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Zaproponuj 5 świeżych tematów contentowych na ten tydzień.' },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 700,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ topics: result.topics ?? [] })
  } catch (err) {
    console.error('[suggest-topics]', err)
    return NextResponse.json({ error: 'Failed to suggest topics' }, { status: 500 })
  }
}
