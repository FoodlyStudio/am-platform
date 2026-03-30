import { NextRequest, NextResponse } from 'next/server'
import { generateCarousel } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const { topic, audience } = await req.json()
    if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    const slides = await generateCarousel(topic, audience ?? 'general audience')
    return NextResponse.json({ slides })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
