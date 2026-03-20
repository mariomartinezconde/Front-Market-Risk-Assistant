'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Send, Loader2, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chatApi, Conversation, Message, SourceCitation } from '@/lib/api'
import { cn, confidenceLabel, confidenceColor, formatRelative, docTypeLabel } from '@/lib/utils'

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasSentInitial = useRef(false)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await chatApi.getConversation(id)
        setConversation(data)
        scrollToBottom()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, scrollToBottom])

  // Handle pre-filled question from home page
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && !hasSentInitial.current && !loading) {
      hasSentInitial.current = true
      sendMessage(q)
    }
  }, [loading, searchParams])

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || sending) return

    setSending(true)
    setInput('')

    // Optimistic user bubble
    const optimisticUser: Message = {
      id: `opt-${Date.now()}`,
      conversation_id: id,
      role: 'user',
      content: msg,
      sources: [],
      confidence: null,
      created_at: new Date().toISOString(),
    }
    setConversation(prev => prev ? { ...prev, messages: [...prev.messages, optimisticUser] } : prev)
    scrollToBottom()

    try {
      const res = await chatApi.sendMessage(id, msg)
      // Reload full conversation to get accurate state
      const updated = await chatApi.getConversation(id)
      setConversation(updated)
      scrollToBottom()
    } catch (e) {
      // Remove optimistic bubble on error
      setConversation(prev => prev
        ? { ...prev, messages: prev.messages.filter(m => m.id !== optimisticUser.id) }
        : prev
      )
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-6 py-3.5 bg-white border-b border-surface-border">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-ink truncate">
            {conversation?.title ?? 'Conversation'}
          </h1>
          <p className="text-xs text-ink-faint">
            {conversation?.messages.length ?? 0} messages
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {(!conversation?.messages || conversation.messages.length === 0) && (
            <div className="text-center py-12">
              <p className="text-ink-muted text-sm">Send a message to get started.</p>
            </div>
          )}
          {conversation?.messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {sending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-surface-border px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-surface-secondary rounded-xl border border-surface-border px-4 py-3 focus-within:border-brand-400 focus-within:shadow-card transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              placeholder="Ask about market risk regulations, policies, or procedures…"
              className="flex-1 bg-transparent resize-none outline-none text-sm text-ink placeholder-ink-faint leading-relaxed min-h-[24px] max-h-[160px]"
              disabled={sending}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              className="flex-shrink-0 p-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-ink-faint mt-2 text-center">
            Answers are grounded in indexed documents. Always verify critical regulatory requirements.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}
      <div className={cn('max-w-[85%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        {/* Bubble */}
        <div className={cn(
          'rounded-2xl px-4 py-3',
          isUser
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-white border border-surface-border shadow-card rounded-tl-sm'
        )}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Confidence + Sources (assistant only) */}
        {!isUser && (
          <div className="space-y-2">
            {/* Confidence badge */}
            {message.confidence && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
                confidenceColor(message.confidence)
              )}>
                {confidenceLabel(message.confidence)}
              </span>
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="bg-white border border-surface-border rounded-xl overflow-hidden shadow-card">
                <button
                  onClick={() => setSourcesOpen(!sourcesOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-ink-secondary hover:bg-surface-secondary transition-colors"
                >
                  <span>{message.sources.length} source{message.sources.length > 1 ? 's' : ''} cited</span>
                  {sourcesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {sourcesOpen && (
                  <div className="border-t border-surface-border divide-y divide-surface-border">
                    {message.sources.map((src, i) => (
                      <SourceCard key={i} source={src} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-ink-faint">{formatRelative(message.created_at)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SourceCard({ source }: { source: SourceCitation }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p className="text-xs font-semibold text-ink">{source.doc_name}</p>
          <p className="text-xs text-ink-muted">
            {docTypeLabel(source.doc_type)}
            {source.version ? ` · v${source.version}` : ''}
            {source.section_title ? ` · ${source.section_title}` : ''}
          </p>
        </div>
        <span className="text-xs text-ink-faint bg-surface-tertiary px-1.5 py-0.5 rounded font-mono flex-shrink-0">
          {(source.similarity_score * 100).toFixed(0)}%
        </span>
      </div>
      <p className="text-xs text-ink-secondary leading-relaxed line-clamp-3 bg-surface-secondary rounded px-2 py-1.5 mt-1">
        {source.excerpt}
      </p>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="bg-white border border-surface-border shadow-card rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-ink-faint animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
