import OpenAI from 'openai'

let _openai: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

// Legacy helpers used by some routes
export async function generateCarousel(topic: string, audience: string): Promise<string[]> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert LinkedIn content creator specializing in carousel posts. Return a JSON array of slide texts.' },
      { role: 'user', content: `Create a 7-slide LinkedIn carousel about "${topic}" for audience: ${audience}. Return JSON array of strings.` },
    ],
    response_format: { type: 'json_object' },
  })
  const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
  return parsed.slides ?? []
}

export async function generateHook(topic: string, style: string): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert at writing viral LinkedIn hooks.' },
      { role: 'user', content: `Write a ${style} hook for LinkedIn post about: ${topic}` },
    ],
    max_tokens: 150,
  })
  return response.choices[0].message.content ?? ''
}

export async function generatePost(topic: string, hook: string, cta: string): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert LinkedIn content creator.' },
      { role: 'user', content: `Write a LinkedIn post about "${topic}". Hook: "${hook}". CTA: "${cta}".` },
    ],
    max_tokens: 500,
  })
  return response.choices[0].message.content ?? ''
}
