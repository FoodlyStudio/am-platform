'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Deal } from '@/types'
import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { MatchOfferResult } from './OfferDocument'

// Dynamically import react-pdf to avoid SSR issues
const OfferDocument = dynamic(
  () => import('./OfferDocument').then((m) => m.OfferDocument),
  { ssr: false },
)

interface OfferPDFButtonProps {
  deal: Deal
  matchResult?: MatchOfferResult | null
  onUpdate?: (id: string, updates: Partial<Deal>) => Promise<void>
}

export function OfferPDFButton({ deal, matchResult, onUpdate }: OfferPDFButtonProps) {
  const [generating, setGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(deal.offer_pdf_url ?? null)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // Lazy-load pdf() to avoid SSR bundle issues
      const { pdf } = await import('@react-pdf/renderer')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(<OfferDocument deal={deal} matchResult={matchResult} /> as any).toBlob()

      const fileName = `${deal.id}/offer-${Date.now()}.pdf`
      const supabase = createClient()

      const { error: uploadErr } = await supabase.storage
        .from('offer-pdfs')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true })

      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from('offer-pdfs')
          .getPublicUrl(fileName)

        const now = new Date().toISOString()
        await supabase
          .from('deals')
          .update({ offer_pdf_url: publicUrl, offer_sent_at: deal.offer_sent_at ?? now })
          .eq('id', deal.id)

        await onUpdate?.(deal.id, {
          offer_pdf_url: publicUrl,
          offer_sent_at: deal.offer_sent_at ?? now,
        })

        setPdfUrl(publicUrl)
        toast.success('PDF zapisany — gotowy do wysłania')
      } else {
        // Storage bucket not configured — fall back to browser download
        downloadBlob(blob, deal.title)
        toast.success('PDF pobrany')
      }
    } catch (err) {
      console.error('[OfferPDFButton]', err)
      toast.error('Błąd generowania PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Generuję PDF…
          </>
        ) : (
          <>
            <FileText size={15} />
            Generuj PDF oferty
          </>
        )}
      </button>

      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary text-sm hover:bg-secondary/20 transition-colors"
        >
          <Download size={13} />
          Otwórz / Pobierz PDF
          <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}

function downloadBlob(blob: Blob, title: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `oferta-${title.replace(/\s+/g, '-').toLowerCase()}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
