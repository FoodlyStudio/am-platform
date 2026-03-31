import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'


export async function POST(req: NextRequest) {
  try {
    const { diagnosis_notes, segment, project_type } = await req.json() as {
      diagnosis_notes?: string
      segment?: string
      project_type?: string
    }

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Jesteś ekspertem sprzedażowym AM Automations. Szacujesz straty finansowe klientów. Odpowiadasz WYŁĄCZNIE w JSON, bez dodatkowego tekstu.',
        },
        {
          role: 'user',
          content: `Oszacuj ile firma traci dziennie/miesięcznie/rocznie przez zidentyfikowany problem. Bądź konkretny i realistyczny.

Segment: ${segment ?? 'ogólny'}
Typ projektu: ${project_type ?? 'Web/AI'}
Diagnoza: ${diagnosis_notes ?? 'Brak danych'}

Wygeneruj JSON:
{
  "daily_loss": liczba_PLN,
  "monthly_loss": liczba_PLN,
  "yearly_loss": liczba_PLN,
  "roi_months": liczba_miesięcy_zwrotu,
  "calculation_reasoning": "krótkie wyjaśnienie jak doszedłeś do tych liczb (2-3 zdania)",
  "loss_category": "utracone_leady|czas_pracownikow|utracone_sprzedaze|koszty_operacyjne"
}

Zasady:
- Bądź konserwatywny, ale przekonujący. Lepiej zaniżyć niż przesadzić.
- daily_loss * 30 ≈ monthly_loss, daily_loss * 365 ≈ yearly_loss
- roi_months: inwestycja typowo 5000-15000 PLN. Ile miesięcy by się zwróciła przy tych stratach?
- Podaj LICZBY, nie zakresy. Całe PLN.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 500,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[ai-loss-calculator]', err)
    return NextResponse.json({ error: 'Błąd kalkulacji strat' }, { status: 500 })
  }
}
