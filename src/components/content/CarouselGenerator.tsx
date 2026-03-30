'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export function CarouselGenerator() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [slides, setSlides] = useState<string[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!topic.trim()) return toast.error('Enter a topic')
    setLoading(true)
    try {
      const res = await fetch('/api/content/carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience }),
      })
      const data = await res.json()
      setSlides(data.slides ?? [])
      setCurrentSlide(0)
      toast.success('Carousel generated!')
    } catch {
      toast.error('Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. How to close enterprise deals"
        />
        <Input
          label="Target audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. B2B founders, sales managers"
        />
      </div>
      <Button onClick={generate} loading={loading} className="w-full md:w-auto">
        <Sparkles size={16} />
        Generate Carousel
      </Button>

      {slides.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/50">
              Slide {currentSlide + 1} / {slides.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="!p-1.5"
                disabled={currentSlide === 0}
                onClick={() => setCurrentSlide((s) => s - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="!p-1.5"
                disabled={currentSlide === slides.length - 1}
                onClick={() => setCurrentSlide((s) => s + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
          <Card className="aspect-square max-w-sm flex items-center justify-center text-center bg-gradient-to-br from-primary/20 to-secondary/10 border-primary/20">
            <p className="text-white text-sm leading-relaxed px-6">{slides[currentSlide]}</p>
          </Card>
          <div className="flex gap-1.5 mt-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentSlide ? 'bg-primary' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
