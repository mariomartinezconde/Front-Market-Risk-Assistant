import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SourceCitation {
  doc_id: string
  doc_name: string
  doc_type: string
  version: string | null
  section_title: string | null
  excerpt: string
  similarity_score: number
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  sources: SourceCitation[]
  confidence: string | null
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages: Message[]
}

export interface ConversationSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface Document {
  id: string
  filename: string
  original_filename: string
  file_type: string
  file_size_bytes: number
  doc_type: string
  version: string | null
  status: 'uploaded' | 'parsing' | 'indexed' | 'failed'
  chunk_count: number
  error_message: string | null
  uploaded_at: string
  indexed_at: string | null
}

export interface AdminStatus {
  status: string
  version: string
  llm_provider: string
  llm_model: string
  llm_configured: boolean
  vectorstore_loaded: boolean
  total_chunks: number
  total_documents: number
  total_conversations: number
  embedding_model: string
}

// ── Chat API ──────────────────────────────────────────────────────────────────

export const chatApi = {
  createConversation: async (title?: string): Promise<Conversation> => {
    const { data } = await api.post('/chat/conversations', { title })
    return data
  },
  listConversations: async (): Promise<ConversationSummary[]> => {
    const { data } = await api.get('/chat/conversations')
    return data
  },
  getConversation: async (id: string): Promise<Conversation> => {
    const { data } = await api.get(`/chat/conversations/${id}`)
    return data
  },
  sendMessage: async (conversationId: string, message: string): Promise<{ message: Message; conversation_id: string }> => {
    const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, { message })
    return data
  },
  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/chat/conversations/${id}`)
  },
}

// ── Documents API ─────────────────────────────────────────────────────────────

export const documentsApi = {
  upload: async (file: File): Promise<{ document_id: string; filename: string; status: string; message: string }> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  list: async (): Promise<Document[]> => {
    const { data } = await api.get('/documents')
    return data
  },
  get: async (id: string): Promise<Document> => {
    const { data } = await api.get(`/documents/${id}`)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`)
  },
  reindex: async (id: string) => {
    const { data } = await api.post(`/documents/${id}/reindex`)
    return data
  },
  reindexAll: async () => {
    const { data } = await api.post('/documents/reindex-all')
    return data
  },
}

// ── System API ────────────────────────────────────────────────────────────────

export const systemApi = {
  health: async () => {
    const { data } = await api.get('/health')
    return data
  },
  status: async (): Promise<AdminStatus> => {
    const { data } = await api.get('/admin/status')
    return data
  },
}
