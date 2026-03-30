import { NextRequest, NextResponse } from 'next/server'
import { generatePost } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const { topic, hook, cta } = await req.json()
    if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    const post = await generatePost(topic, hook ?? '', cta ?? '')
    return NextResponse.json({ post })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
