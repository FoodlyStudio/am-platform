import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'


const CHANNEL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin_company: 'LinkedIn (firma)',
  linkedin_personal: 'LinkedIn (osobisty)',
  facebook: 'Facebook',
  newsletter: 'Newsletter e-mail',
}

const TYPE_LABELS: Record<string, string> = {
  carousel: 'karuzela (seria slajdów — podaj konspekt z podziałem na slajdy)',
  single_post: 'pojedynczy post graficzny z podpisem',
  reel_script: 'skrypt do Reels/TikTok (podzielony na sceny)',
  story: 'Story (seria 3-5 kart)',
  linkedin_post: 'post tekstowy LinkedIn',
  article: 'długi artykuł ekspercki',
  newsletter: 'newsletter z sekcjami',
}

const SYSTEM_PROMPT = `Jesteś ekspertem od marketingu treści dla AM Automations — polskiej agencji web i automatyzacji AI.
Sprzedajemy: strony www z konwersją (2-5k PLN), chatboty AI (3-8k PLN), systemy wewnętrzne (8-25k PLN).
Klienci: właściciele małych firm (gabinety medyczne, kancelarie, beauty, budowlanka, szkolenia).

Zasady pisania:
- Konkretne liczby i fakty (nie "znacznie" ale "o 40%")
- Krótkie zdania, dużo łamania linii
- Hook w pierwszym zdaniu
- Żadnego korporacyjnego bełkotu
- Emoji tylko jeśli pasuje do kanału (Instagram: tak, LinkedIn: oszczędnie)

Odpowiedz WYŁĄCZNIE prawidłowym JSON:
{
  "title": "Krótki tytuł/temat (max 60 znaków)",
  "content_body": "Treść posta gotowa do publikacji — używaj \\n\\n między akapitami",
  "hook": "Mocne pierwsze zdanie/nagłówek (max 120 znaków)",
  "cta": "Konkretne wezwanie do działania (jedno zdanie)",
  "hashtags": ["automatyzacja", "aibiznes", "malafirma"]
}`

export async function POST(req: NextRequest) {
  try {
    const { channel, content_type, title, hook, topic } = (await req.json()) as {
      channel?: string
      content_type?: string
      title?: string
      hook?: string
      topic?: string
    }

    const channelLabel = CHANNEL_LABELS[channel ?? ''] ?? (channel ?? 'ogólny')
    const typeLabel = TYPE_LABELS[content_type ?? ''] ?? (content_type ?? 'post')

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            `Kanał: ${channelLabel}`,
            `Typ treści: ${typeLabel}`,
            `Temat/tytuł: ${title || topic || 'automatyzacja biznesowa dla małych firm'}`,
            hook ? `Rozwiń ten hook: "${hook}"` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.82,
      max_tokens: 900,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[generate-content]', err)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}
