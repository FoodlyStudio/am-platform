'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sparkles, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export function PostEditor() {
  const [topic, setTopic] = useState('')
  const [hook, setHook] = useState('')
  const [cta, setCta] = useState('')
  const [post, setPost] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!topic.trim()) return toast.error('Enter a topic')
    setLoading(true)
    try {
      const res = await fetch('/api/content/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, hook, cta }),
      })
      const data = await res.json()
      setPost(data.post ?? '')
      toast.success('Post generated!')
    } catch {
      toast.error('Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(post)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!')
  }

  return (
    <div className="space-y-4">
      <Input
        label="Topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="What is the post about?"
      />
      <Input
        label="Hook (optional)"
        value={hook}
        onChange={(e) => setHook(e.target.value)}
        placeholder="Opening line..."
      />
      <Input
        label="CTA (optional)"
        value={cta}
        onChange={(e) => setCta(e.target.value)}
        placeholder="Call to action..."
      />
      <Button onClick={generate} loading={loading}>
        <Sparkles size={16} />
        Generate Post
      </Button>

      {post && (
        <div className="relative">
          <textarea
            value={post}
            onChange={(e) => setPost(e.target.value)}
            className="w-full h-48 bg-card border border-white/10 rounded-xl p-4 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 !p-1.5"
            onClick={copy}
          >
            {copied ? <Check size={14} className="text-secondary" /> : <Copy size={14} />}
          </Button>
          <p className="text-xs text-white/30 mt-1 text-right">{post.length} chars</p>
        </div>
      )}
    </div>
  )
}
