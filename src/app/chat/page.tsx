'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart2, ArrowRight, FileText, Shield, Search, Loader2 } from 'lucide-react'
import { chatApi } from '@/lib/api'

const EXAMPLES = [
  'What are the minimum capital requirements under CRR Article 92?',
  'How should market risk be calculated using the Standardised Approach?',
  'What VaR reporting obligations apply to trading book positions?',
  'Compare the Internal Model Approach vs the Standardised Approach for market risk.',
]

export default function ChatHome() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const start = async (message?: string) => {
    setLoading(true)
    try {
      const conv = await chatApi.createConversation()
      if (message) {
        // Pre-fill by redirecting with query param
        router.push(`/chat/${conv.id}?q=${encodeURIComponent(message)}`)
      } else {
        router.push(`/chat/${conv.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full">
      {/* Hero */}
      <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-5 shadow-card">
        <BarChart2 className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-2xl font-semibold text-ink text-center mb-2">
        Market Risk AI Assistant
      </h1>
      <p className="text-ink-muted text-center text-sm mb-8 max-w-md">
        Ask questions about market risk regulations, internal policies, and procedures.
        Answers are grounded in your indexed documents with full source traceability.
      </p>

      {/* Capability pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {[
          { icon: Search, label: 'Regulatory queries' },
          { icon: FileText, label: 'Document citations' },
          { icon: Shield, label: 'Conflict detection' },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-surface-border text-xs text-ink-secondary shadow-card">
            <Icon className="w-3.5 h-3.5 text-brand-600" />
            {label}
          </span>
        ))}
      </div>

      {/* Example prompts */}
      <div className="w-full space-y-2 mb-6">
        <p className="text-xs font-medium text-ink-faint uppercase tracking-wide mb-3">Example questions</p>
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            onClick={() => start(ex)}
            disabled={loading}
            className="w-full text-left flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-surface-border hover:border-brand-300 hover:shadow-card-hover transition-all group disabled:opacity-60"
          >
            <span className="flex-1 text-sm text-ink-secondary group-hover:text-ink">{ex}</span>
            <ArrowRight className="w-4 h-4 text-ink-faint group-hover:text-brand-600 flex-shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      <button
        onClick={() => start()}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Start new conversation
      </button>
    </div>
  )
}
