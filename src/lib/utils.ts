import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatRelative(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function confidenceLabel(c: string | null): string {
  if (!c) return ''
  return { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence', insufficient: 'Insufficient context' }[c] ?? c
}

export function confidenceColor(c: string | null): string {
  return {
    high: 'text-emerald-600 bg-emerald-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-orange-600 bg-orange-50',
    insufficient: 'text-red-600 bg-red-50',
  }[c ?? ''] ?? 'text-gray-600 bg-gray-50'
}

export function statusColor(s: string): string {
  return {
    indexed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    parsing: 'text-blue-700 bg-blue-50 border-blue-200',
    uploaded: 'text-gray-700 bg-gray-50 border-gray-200',
    failed: 'text-red-700 bg-red-50 border-red-200',
  }[s] ?? 'text-gray-700 bg-gray-50 border-gray-200'
}

export function docTypeLabel(t: string): string {
  return {
    regulation: 'Regulation',
    internal_policy: 'Internal Policy',
    procedure: 'Procedure',
    guidance: 'Guidance',
    unknown: 'Document',
  }[t] ?? t
}
