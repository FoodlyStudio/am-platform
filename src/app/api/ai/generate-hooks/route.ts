import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'


const TYPE_INSTRUCTIONS: Record<string, string> = {
  hook: `Hook zatrzymujący scrollowanie — pierwsze zdanie posta. Max 15 słów.
  Techniki: szokujące twierdzenie, pytanie retoryczne, liczba, "nikt ci nie powie że...", przed/po.`,

  cta: `Wezwanie do działania kończące post. Max 20 słów.
  Techniki: pytanie otwarte do dyskusji, instrukcja ("Wpisz X w komentarzu"), "Zapisz jeśli...", "Wyślij do kogoś kto...".`,

  carousel: `Tytuł/hook dla karuzeli Instagram. To jest slajd 1 — zatrzymuje scrollowanie.
  Max 12 słów. Musi działać bez kontekstu, jako samodzielne zdanie.`,

  linkedin_post: `Pierwsza linia posta LinkedIn. Decyduje o "pokaż więcej". Max 10 słów.
  Format: zaskakujące twierdzenie LUB krótkie pytanie LUB liczba + twierdzenie.`,

  reel_script: `Pierwsze zdanie Reela — mówione do kamery. Max 8 słów.
  Musi być naturalne jak mówione słowo. Zatrzymuje przewijanie w ciągu 1 sekundy.`,

  ad_angle: `Kąt reklamowy — unikalny punkt widzenia dla kreacji płatnej reklamy.
  Format: problem klienta + propozycja wartości. Max 15 słów. Może być nagłówkiem reklamy.`,
}

const CATEGORY_CONTEXT: Record<string, string> = {
  lead_generation: 'Cel: przyciągnąć nowych potencjalnych klientów, budowanie zainteresowania',
  automation: 'Temat: automatyzacja procesów biznesowych, chatboty AI, systemy',
  trust: 'Cel: budowanie zaufania, social proof, transparentność',
  urgency: 'Cel: wywołanie pilności, ograniczone zasoby, czas',
  case_study: 'Format: historia klienta, wyniki, transformacja przed/po',
  process: 'Temat: jak pracujemy, nasze metody, behind-the-scenes',
}

export async function POST(req: NextRequest) {
  try {
    const {
      topic,
      templateType = 'hook',
      category = 'lead_generation',
      count = 10,
    } = (await req.json()) as {
      topic: string
      templateType?: string
      category?: string
      count?: number
    }

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 })
    }

    const typeInstructions = TYPE_INSTRUCTIONS[templateType] ?? TYPE_INSTRUCTIONS.hook
    const catContext = CATEGORY_CONTEXT[category] ?? ''
    const n = Math.min(Math.max(count, 3), 15)

    const SYSTEM_PROMPT = `Jesteś copywriterem dla AM Automations — polskiej agencji web i automatyzacji AI.
AM Automations buduje strony, chatboty AI, systemy wewnętrzne dla małych firm usługowych.
Klienci: gabinety medyczne, kancelarie, beauty, budowlanka, szkolenia.

Generujesz: ${templateType.toUpperCase()}
${typeInstructions}

Kontekst kategorii: ${catContext}
Pisz po polsku. BEZ emotikonów. Konkretne, bez korporacyjnego bełkotu.

Odpowiedz WYŁĄCZNIE prawidłowym JSON:
{
  "items": [
    {
      "text": "Treść szablonu gotowa do użycia",
      "name": "Krótka nazwa szablonu (3-5 słów)",
      "strength": "why this works — 1 sentence in Polish"
    }
  ]
}`

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Wygeneruj ${n} ${templateType === 'hook' ? 'hooków' : 'szablonów'} na temat: "${topic}"`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.88,
      max_tokens: 1400,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ items: result.items ?? [] })
  } catch (err) {
    console.error('[generate-hooks]', err)
    return NextResponse.json({ error: 'Failed to generate hooks' }, { status: 500 })
  }
}
