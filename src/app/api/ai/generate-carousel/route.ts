import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { topic, slideCount = 7, segment = 'ogólny', tone = 'premium' } = (await req.json()) as {
      topic: string
      slideCount?: number
      segment?: string
      tone?: string
    }

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 })
    }

    const n = Math.min(Math.max(slideCount, 5), 10)

    const SYSTEM_PROMPT = `Stwórz karuzelę na Instagram dla firmy AM Automations (firma technologiczna, budujemy strony, systemy, chatboty AI dla firm usługowych).
Temat: ${topic}. Liczba slajdów: ${n}. Segment: ${segment}. Ton: ${tone}.

Slajd 1 = hook (max 15 słów, zatrzymuje scrollowanie, intrygujące pytanie lub szokujące twierdzenie).
Slajdy 2–${n - 1} = treść (max 30 słów per slajd, konkretne fakty, bez lania wody, każdy slajd = 1 myśl).
Ostatni slajd (${n}) = CTA (konkretna akcja: "Wpisz X w komentarzu", "Zapisz ten post", "Wyślij do kogoś kto to potrzebuje" itp.).

Ton: ${tone}, technologiczny, bezpośredni. Nigdy nie używaj emotikonów.
Każdy slajd ma też note = krótka wskazówka dla designera (kolor tła, układ, element graficzny).

Odpowiedz WYŁĄCZNIE prawidłowym JSON:
{
  "slides": [
    {"number": 1, "text": "...", "note": "design hint dla grafika"},
    {"number": 2, "text": "...", "note": "..."}
  ]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Temat karuzeli: ${topic}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.75,
      max_tokens: 1200,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ slides: result.slides ?? [] })
  } catch (err) {
    console.error('[generate-carousel]', err)
    return NextResponse.json({ error: 'Failed to generate carousel' }, { status: 500 })
  }
}
