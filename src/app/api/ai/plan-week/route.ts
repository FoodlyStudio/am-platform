import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { format, addDays } from 'date-fns'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Jesteś strategiem treści dla AM Automations — polskiej agencji web i automatyzacji AI.
Klienci AM Automations: właściciele małych firm (gabinety medyczne, kancelarie, beauty, budowlanka, szkolenia).

Stwórz plan 5 postów na tydzień roboczy (pon–pt):
- 2x Instagram: emocjonalne, wizualne, konkretne case study lub hooks
- 2x LinkedIn (personal lub company): edukacja, personal branding, ROI, przykłady klientów
- 1x Facebook: angażujące pytania, mini-poradniki

Rozmaitość typów: single_post, carousel, linkedin_post.
Godziny publikacji: Instagram → 9:00 lub 18:00, LinkedIn → 8:00 lub 12:00, Facebook → 17:00.
Każdy post inny temat, inny format.

Odpowiedz WYŁĄCZNIE prawidłowym JSON z kluczem "posts" zawierającym tablicę 5 obiektów:
{
  "posts": [
    {
      "channel": "instagram|linkedin_personal|linkedin_company|facebook",
      "content_type": "single_post|carousel|linkedin_post",
      "scheduled_date": "YYYY-MM-DD",
      "scheduled_time": "HH:MM",
      "title": "Tytuł (max 60 znaków)",
      "content_body": "Treść gotowa do publikacji (z \\n\\n między akapitami)",
      "hook": "Mocny hook (max 120 znaków)",
      "cta": "Wezwanie do działania",
      "hashtags": ["tag1", "tag2", "tag3"],
      "status": "ready"
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const { weekStart } = (await req.json()) as { weekStart?: string }

    const startDate = weekStart ? new Date(weekStart) : new Date()
    const weekEnd = addDays(startDate, 4)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Zaplanuj tydzień: ${format(startDate, 'yyyy-MM-dd')} (poniedziałek) — ${format(weekEnd, 'yyyy-MM-dd')} (piątek). Każdy post na inny dzień roboczy.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.75,
      max_tokens: 2500,
    })

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    const posts: unknown[] = Array.isArray(raw)
      ? raw
      : (raw.posts ?? raw.plan ?? raw.content ?? [])

    return NextResponse.json({ posts })
  } catch (err) {
    console.error('[plan-week]', err)
    return NextResponse.json({ error: 'Failed to plan week' }, { status: 500 })
  }
}
