import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'


const TYPE_DESCRIPTIONS: Record<string, string> = {
  edukacyjny: 'edukacyjny — uczy czegoś konkretnego, daje wartość praktyczną',
  case_study: 'case study — historia klienta z konkretnym wynikiem (przed → po → efekt)',
  behind_scenes: 'za kulisami — pokazuje proces pracy, kultura firmy, dzień z życia',
  tips: 'lista porad — 3-5 konkretnych wskazówek w formacie listy',
  proces_am: 'proces AM Automations — jak działamy, nasze metodologie, co wyróżnia',
}

export async function POST(req: NextRequest) {
  try {
    const { topic, postType = 'edukacyjny' } = (await req.json()) as {
      topic: string
      postType?: string
    }

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 })
    }

    const typeDesc = TYPE_DESCRIPTIONS[postType] ?? postType

    const SYSTEM_PROMPT = `Napisz post na LinkedIn dla foundera AM Automations (agencja web + automatyzacje AI dla małych firm).
Temat: ${topic}. Typ: ${typeDesc}.

ZASADY ABSOLUTNE:
1. Hook w pierwszej linii (max 10 słów) — zatrzymuje scrollowanie, intryguje
2. Pusta linia po hooku
3. Krótkie paragrafy (1-2 zdania max), puste linie między nimi
4. Max 1300 znaków łącznie
5. BEZ emotikonów w treści
6. BEZ hashtagów w treści posta (podaj je osobno)
7. Ton: bezpośredni, kompetentny, bez hussle culture, bez pustych frazesów
8. Zakończ konkretnym CTA zachęcającym do interakcji (pytanie LUB instrukcja do skomentowania)

Szacuj zasięg: edukacyjny = wysoki (800-3000), case study = bardzo wysoki (1500-5000), tips = średni (500-1500), behind scenes = niski (300-800), proces = niski (300-800).

Odpowiedz WYŁĄCZNIE prawidłowym JSON:
{
  "post": "Pełna treść posta z\\n\\n między akapitami",
  "hashtags": ["automatyzacja", "aibiznes", "malafirma"],
  "estimated_reach_min": 500,
  "estimated_reach_max": 2000,
  "char_count": 920
}`

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Napisz post LinkedIn: ${topic} (typ: ${typeDesc})` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.78,
      max_tokens: 900,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[generate-linkedin]', err)
    return NextResponse.json({ error: 'Failed to generate LinkedIn post' }, { status: 500 })
  }
}
