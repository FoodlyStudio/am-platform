import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Jesteś ekspertem od repurposingu treści dla AM Automations (agencja web i automatyzacji AI).
Na podstawie podanego posta/treści stwórz 5 adaptacji na różne formaty.

WAŻNE: Każda wersja musi być dopasowana do specyfiki danego formatu — nie kopiuj mechanicznie, adaptuj.

Odpowiedz WYŁĄCZNIE prawidłowym JSON:
{
  "carousel": {
    "title": "Tytuł karuzeli",
    "slides": [
      {"number": 1, "text": "Hook (max 15 słów)", "note": "design hint"},
      {"number": 2, "text": "Treść slajdu 2 (max 30 słów)", "note": "hint"},
      {"number": 3, "text": "Treść slajdu 3 (max 30 słów)", "note": "hint"},
      {"number": 4, "text": "Treść slajdu 4 (max 30 słów)", "note": "hint"},
      {"number": 5, "text": "CTA (konkretna akcja)", "note": "hint"}
    ]
  },
  "facebook": {
    "post": "Krótki, angażujący post (max 300 słów). Mów do konkretnej osoby. Zakończ pytaniem lub call to share.",
    "hashtags": ["tag1", "tag2"]
  },
  "story": {
    "screens": [
      {"number": 1, "text": "Ekran 1 (max 10 słów, widoczne na małym ekranie)", "hint": "tło/styl/sticker"},
      {"number": 2, "text": "Ekran 2 (pytanie do widza lub fakt)", "hint": "..."},
      {"number": 3, "text": "Ekran 3 (konkluzja lub CTA)", "hint": "..."}
    ]
  },
  "reel": {
    "duration": "35 sekund",
    "hook_line": "Pierwsze zdanie mówione (max 8 słów, na ekranie jako tekst)",
    "script": "Pełny skrypt co mówisz do kamery. Naturalny, konwersacyjny. Format: [czas] Tekst\\n[czas] Tekst",
    "caption": "Podpis pod Reel (2-3 zdania + hashtagi)"
  },
  "newsletter": {
    "subject": "Temat emaila (max 50 znaków, bez clickbaitu)",
    "snippet": "2-3 zdania które idą jako lead paragraph w newsletterze. Kończy się zachętą do kliknięcia w link.",
    "preview_text": "Tekst podglądu (max 90 znaków)"
  }
}`

export async function POST(req: NextRequest) {
  try {
    const { sourceText } = (await req.json()) as { sourceText: string }

    if (!sourceText?.trim()) {
      return NextResponse.json({ error: 'sourceText required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Stwórz 5 wersji tego contentu na różne formaty:\n\n${sourceText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[repurpose-content]', err)
    return NextResponse.json({ error: 'Failed to repurpose content' }, { status: 500 })
  }
}
