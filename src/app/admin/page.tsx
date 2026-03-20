'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload, RefreshCw, Trash2, FileText, CheckCircle2, XCircle,
  Clock, Loader2, BarChart2, AlertTriangle, ChevronLeft,
  Database, Cpu, Zap
} from 'lucide-react'
import Link from 'next/link'
import { documentsApi, systemApi, Document, AdminStatus } from '@/lib/api'
import { cn, formatDate, formatBytes, statusColor, docTypeLabel } from '@/lib/utils'

export default function AdminPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [reindexingAll, setReindexingAll] = useState(false)
  const [actionMap, setActionMap] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadAll = useCallback(async () => {
    try {
      const [docs, stat] = await Promise.all([documentsApi.list(), systemApi.status()])
      setDocuments(docs)
      setStatus(stat)
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 6000)
    return () => clearInterval(interval)
  }, [loadAll])

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return
    setUploading(true)
    try {
      for (const file of accepted) {
        await documentsApi.upload(file)
      }
      showToast(`${accepted.length} file(s) uploaded. Indexing started.`)
      await loadAll()
    } catch (e: any) {
      showToast(e?.response?.data?.detail ?? 'Upload failed.', 'error')
    } finally {
      setUploading(false)
    }
  }, [loadAll])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  })

  const reindex = async (docId: string) => {
    setActionMap(p => ({ ...p, [docId]: 'reindexing' }))
    try {
      await documentsApi.reindex(docId)
      showToast('Document reindexed successfully.')
      await loadAll()
    } catch {
      showToast('Reindex failed.', 'error')
    } finally {
      setActionMap(p => { const n = { ...p }; delete n[docId]; return n })
    }
  }

  const deleteDoc = async (docId: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return
    setActionMap(p => ({ ...p, [docId]: 'deleting' }))
    try {
      await documentsApi.delete(docId)
      showToast('Document deleted.')
      await loadAll()
    } catch {
      showToast('Delete failed.', 'error')
    } finally {
      setActionMap(p => { const n = { ...p }; delete n[docId]; return n })
    }
  }

  const reindexAll = async () => {
    setReindexingAll(true)
    try {
      const r = await documentsApi.reindexAll()
      showToast(`Reindexed ${r.succeeded}/${r.total} documents.`)
      await loadAll()
    } catch {
      showToast('Reindex all failed.', 'error')
    } finally {
      setReindexingAll(false)
    }
  }

  return (
    <div className="min-h-full bg-surface-secondary">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-card-hover text-sm font-medium',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-surface-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/chat" className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Back to chat
            </Link>
            <div className="w-px h-4 bg-surface-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Document Library</p>
                <p className="text-xs text-ink-muted">Manage your knowledge base</p>
              </div>
            </div>
          </div>
          <button
            onClick={reindexAll}
            disabled={reindexingAll || documents.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink-secondary bg-white border border-surface-border rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
          >
            {reindexingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Reindex all
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* System Status Cards */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusCard
              icon={Database}
              label="Documents"
              value={String(status.total_documents)}
              color="brand"
            />
            <StatusCard
              icon={Zap}
              label="Chunks indexed"
              value={String(status.total_chunks)}
              color="emerald"
            />
            <StatusCard
              icon={Cpu}
              label="LLM"
              value={status.llm_configured ? 'Connected' : 'Not configured'}
              sub={status.llm_model}
              color={status.llm_configured ? 'emerald' : 'red'}
            />
            <StatusCard
              icon={CheckCircle2}
              label="Vector store"
              value={status.vectorstore_loaded ? 'Loaded' : 'Empty'}
              color={status.vectorstore_loaded ? 'emerald' : 'amber'}
            />
          </div>
        )}

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
            isDragActive
              ? 'border-brand-400 bg-brand-50'
              : 'border-surface-border bg-white hover:border-brand-300 hover:bg-brand-50/30'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            ) : (
              <Upload className={cn('w-10 h-10', isDragActive ? 'text-brand-500' : 'text-ink-faint')} />
            )}
            <div>
              <p className="text-sm font-medium text-ink">
                {isDragActive ? 'Drop files here' : uploading ? 'Uploading…' : 'Upload documents'}
              </p>
              <p className="text-xs text-ink-muted mt-1">
                Drag & drop or click to select · PDF, DOCX, TXT · Max 50 MB
              </p>
            </div>
          </div>
        </div>

        {/* Documents table */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              Documents ({documents.length})
            </h2>
            <button onClick={loadAll} className="text-xs text-ink-muted hover:text-ink flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loadingDocs ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-ink-faint mx-auto mb-3" />
              <p className="text-sm font-medium text-ink-secondary">No documents yet</p>
              <p className="text-xs text-ink-muted mt-1">Upload your first document above to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-secondary">
                    <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase tracking-wide">Document</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-ink-muted uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-ink-muted uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-ink-muted uppercase tracking-wide">Chunks</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-ink-muted uppercase tracking-wide">Uploaded</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {documents.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      action={actionMap[doc.id]}
                      onReindex={() => reindex(doc.id)}
                      onDelete={() => deleteDoc(doc.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: any; label: string; value: string; sub?: string;
  color: 'brand' | 'emerald' | 'amber' | 'red'
}) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-4">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', colors[color])}>
        <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
      </div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-base font-semibold text-ink mt-0.5">{value}</p>
      {sub && <p className="text-xs text-ink-faint truncate">{sub}</p>}
    </div>
  )
}

function DocumentRow({
  doc, action, onReindex, onDelete,
}: {
  doc: Document; action?: string;
  onReindex: () => void; onDelete: () => void;
}) {
  const busy = !!action

  return (
    <tr className="hover:bg-surface-secondary transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-tertiary flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-ink-muted" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink truncate max-w-xs">{doc.original_filename}</p>
            <p className="text-xs text-ink-faint">{formatBytes(doc.file_size_bytes)} · {doc.file_type.toUpperCase()}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="text-xs text-ink-secondary">{docTypeLabel(doc.doc_type)}</span>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={doc.status} errorMessage={doc.error_message} />
      </td>
      <td className="px-4 py-4">
        <span className="text-xs text-ink-secondary font-mono">
          {doc.chunk_count > 0 ? doc.chunk_count : '—'}
        </span>
      </td>
      <td className="px-4 py-4">
        <span className="text-xs text-ink-muted">{formatDate(doc.uploaded_at)}</span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onReindex}
            disabled={busy}
            className="p-1.5 rounded-lg text-ink-muted hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 transition-colors"
            title="Reindex"
          >
            {action === 'reindexing'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="p-1.5 rounded-lg text-ink-muted hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
            title="Delete"
          >
            {action === 'deleting'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </td>
    </tr>
  )
}

function StatusBadge({ status, errorMessage }: { status: string; errorMessage?: string | null }) {
  const icons: Record<string, any> = {
    indexed: CheckCircle2,
    parsing: Loader2,
    uploaded: Clock,
    failed: XCircle,
  }
  const Icon = icons[status] ?? Clock
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium', statusColor(status))}
      title={errorMessage ?? undefined}
    >
      <Icon className={cn('w-3.5 h-3.5', status === 'parsing' && 'animate-spin')} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
      {status === 'failed' && errorMessage && <AlertTriangle className="w-3.5 h-3.5" />}
    </span>
  )
}
