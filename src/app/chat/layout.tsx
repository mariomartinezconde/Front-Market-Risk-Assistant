'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare, Plus, Settings, Trash2, ChevronRight,
  BarChart2, FileText, Loader2
} from 'lucide-react'
import { chatApi, ConversationSummary } from '@/lib/api'
import { cn, formatRelative } from '@/lib/utils'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatApi.listConversations()
      setConversations(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
    // Poll for updated conversation titles every 5s
    const interval = setInterval(loadConversations, 5000)
    return () => clearInterval(interval)
  }, [loadConversations])

  // Detect active conversation from URL
  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/chat\/([^/]+)/)
    setActiveId(match?.[1] ?? null)
  })

  const newChat = async () => {
    setCreating(true)
    try {
      const conv = await chatApi.createConversation()
      await loadConversations()
      router.push(`/chat/${conv.id}`)
    } finally {
      setCreating(false)
    }
  }

  const deleteConv = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    await chatApi.deleteConversation(id)
    await loadConversations()
    if (activeId === id) router.push('/chat')
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-surface-border shadow-panel">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink leading-none">Market Risk</p>
              <p className="text-xs text-ink-muted mt-0.5">AI Assistant</p>
            </div>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={newChat}
            disabled={creating}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New conversation
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <MessageSquare className="w-8 h-8 text-ink-faint mx-auto mb-2" />
              <p className="text-xs text-ink-muted">No conversations yet</p>
              <p className="text-xs text-ink-faint mt-1">Start a new one above</p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map(conv => (
                <li key={conv.id}>
                  <Link
                    href={`/chat/${conv.id}`}
                    className={cn(
                      'group flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      activeId === conv.id
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-ink-secondary hover:bg-surface-secondary'
                    )}
                  >
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium leading-snug">{conv.title}</p>
                      <p className="text-xs text-ink-faint mt-0.5">
                        {conv.message_count} msg · {formatRelative(conv.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={e => deleteConv(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bottom nav */}
        <div className="px-3 py-3 border-t border-surface-border space-y-0.5">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-secondary hover:bg-surface-secondary transition-colors"
          >
            <FileText className="w-4 h-4 opacity-60" />
            Document library
          </Link>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-surface-secondary">
        {children}
      </main>
    </div>
  )
}
