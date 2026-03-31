import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'
import { createClient } from '@/lib/supabase/server'


// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Jesteś asystentem sprzedażowym firmy AM Automations. Sprzedajemy firmom usługowym w Polsce:
- strony internetowe z konwersją (2000-5000 PLN)
- chatboty AI i automatyzacje kontaktu (3000-8000 PLN)
- systemy wewnętrzne zamiast Exceli (8000-25000 PLN)

Nasz idealny klient to właściciel firmy usługowej, 2-50 pracowników, z przestarzałą stroną, brakiem automatyzacji lub chaosem operacyjnym.

Na podstawie danych wykonaj 4 zadania:
1) SCORE: Oceń 1-10 (1 = nie pasuje, 10 = idealny klient)
   Kryteria: (+) firma usługowa, (+) właściciel/dyrektor, (+) widoczne sygnały zakupowe, (+) strona do poprawy
   (-) korporacja, (-) praca etatowa, (-) brak strony = brak danych

2) PROBLEM: Najbardziej prawdopodobny problem tej firmy (1 zdanie, po polsku)

3) ICEBREAKER: Krótkie zdanie otwierające (max 25 słów), nawiązujące do KONKRETNEJ rzeczy o tej firmie.
   Naturalne, jakby człowiek napisał. BEZ sprzedawania. Zacznij od "Cześć [imię]," lub podobnie.

4) SEGMENT: Który segment najlepiej pasuje:
   gabinety_med / budowlanka / kancelarie / beauty / szkolenia / nieruchomosci / it_male / transport / inne

Odpowiedz WYŁĄCZNIE w JSON: {"score": 8, "problem": "...", "icebreaker": "...", "segment": "..."}`

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchWebsiteText(url: string): Promise<string> {
  try {
    // Normalize URL
    const normalized = url.startsWith('http') ? url : `https://${url}`
    const res = await fetch(normalized, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AMBot/1.0)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    // Strip tags, collapse whitespace, limit to 2000 chars
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000)
  } catch {
    return ''
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { leadId, minScore = 5 } = await req.json() as {
      leadId: string
      minScore?: number
    }

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Fetch lead
    const { data: lead, error: fetchErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (fetchErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // 2. Optionally fetch company website
    let websiteText = ''
    if (lead.company_website) {
      websiteText = await fetchWebsiteText(lead.company_website)
    }

    // 3. Build user message
    const userMessage = [
      `Imię: ${lead.first_name}`,
      `Nazwisko: ${lead.last_name}`,
      `Firma: ${lead.company}`,
      lead.position        ? `Stanowisko: ${lead.position}`           : null,
      lead.industry        ? `Branża (LI): ${lead.industry}`          : null,
      lead.buying_signal   ? `Sygnał zakupowy: ${lead.buying_signal}` : null,
      lead.company_website ? `Strona: ${lead.company_website}`        : null,
      websiteText          ? `\n--- Treść strony (fragment) ---\n${websiteText}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    // 4. Call OpenAI
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 300,
    })

    const raw = completion.choices[0].message.content ?? '{}'
    let parsed: { score: number; problem: string; icebreaker: string; segment: string }

    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 })
    }

    const score     = Math.min(10, Math.max(1, Math.round(Number(parsed.score) || 1)))
    const qualified = score >= minScore

    // 5. Update lead
    const { error: updateErr } = await supabase
      .from('leads')
      .update({
        ai_score:        score,
        ai_problem:      parsed.problem   ?? null,
        ai_icebreaker:   parsed.icebreaker ?? null,
        website_analysis: websiteText      || null,
        status:          qualified ? 'qualified' : 'disqualified',
        segment:         parsed.segment   ?? lead.segment ?? null,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', leadId)

    if (updateErr) {
      console.error('Lead update error:', updateErr)
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }

    // 6. Create deal for qualified leads
    if (qualified) {
      const fullName = `${lead.first_name} ${lead.last_name}`.trim()
      const dealTitle = `${lead.company} — ${lead.position ?? fullName}`

      const { error: dealErr } = await supabase.from('deals').insert({
        lead_id:   leadId,
        stage:     'nowy_lead',
        title:     dealTitle,
        currency:  'PLN',
        notes:     parsed.problem ? `Problem: ${parsed.problem}` : null,
      })

      if (dealErr) {
        // Non-fatal — lead is still qualified
        console.error('Deal creation error:', dealErr)
      }
    }

    return NextResponse.json({
      ok:          true,
      leadId,
      score,
      qualified,
      problem:     parsed.problem,
      icebreaker:  parsed.icebreaker,
      segment:     parsed.segment,
    })
  } catch (err) {
    console.error('score-lead error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
