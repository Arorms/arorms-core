/**
 * Display formatters shared by every arorms frontend. Pure functions, no React, no styling.
 * All of them accept `null | undefined` and render a placeholder instead of throwing, because list
 * rows routinely reference optional backend fields.
 */

/** Fallback for empty values. Pages may override it with their own em dash. */
export const EMPTY_VALUE = '—'

function isBlank(value: string | null | undefined): value is null | undefined | '' {
  return value === null || value === undefined || value === ''
}

/** `2026-09-02T08:10:00Z` → `2026-09-02` (no timezone shifting — backend dates are already local). */
export function formatDate(value: string | null | undefined, fallback = EMPTY_VALUE): string {
  if (isBlank(value)) return fallback
  return value.slice(0, 10)
}

/** `2026-09-02T08:10:00Z` → `2026-09-02 08:10:00`, matching the backend's ISO serialization. */
export function formatDateTime(value: string | null | undefined, fallback = EMPTY_VALUE): string {
  if (isBlank(value)) return fallback
  return value.replace('T', ' ').slice(0, 19)
}

/**
 * Compact list timestamp: time of day for today, `Sep 2` for this year, full date otherwise.
 * Locale-aware via `Intl`; pass a locale to pin it (e.g. the active i18n locale).
 */
export function formatListDate(
  value: string | null | undefined,
  locale?: string,
  fallback = '',
): string {
  if (isBlank(value)) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
  }
  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
  }
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

export function formatNumber(
  value: string | number | null | undefined,
  locale?: string,
  fallback = EMPTY_VALUE,
): string {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(parsed)) return String(value)
  return new Intl.NumberFormat(locale).format(parsed)
}

/** Money with a fixed 2-decimal body; the currency code is appended when supplied. */
export function formatMoney(
  value: string | number | null | undefined,
  options: { currency?: string; locale?: string; fallback?: string } = {},
): string {
  const { currency = '', locale = 'en-US', fallback = EMPTY_VALUE } = options
  if (value === null || value === undefined || value === '') return fallback
  const parsed = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(parsed)) return String(value)
  const body = parsed.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return currency ? `${body} ${currency}` : body
}

/** `1536` → `1.5 KB`. Uses 1024-based units, one decimal below 10. */
export function formatFileSize(bytes: number | null | undefined, fallback = '0 B'): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 1) return fallback
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}

/**
 * Display initials for avatars: `demo.operator@x.cn` → `DE`, `Ada Lovelace` → `AL`, `ada` → `AD`.
 */
export function initials(value: string | null | undefined, max = 2): string {
  if (!value) return '?'
  const clean = value.includes('@') ? value.split('@')[0] : value
  const parts = clean.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return clean.slice(0, 1).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase()
  return parts
    .slice(0, max)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
