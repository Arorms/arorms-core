import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  formatMoney,
  formatNumber,
  initials,
} from './format.ts'

test('date helpers slice ISO values and fall back on empties', () => {
  assert.equal(formatDate('2026-09-02T08:10:00Z'), '2026-09-02')
  assert.equal(formatDateTime('2026-09-02T08:10:00Z'), '2026-09-02 08:10:00')
  assert.equal(formatDate(null), '—')
  assert.equal(formatDateTime(undefined, '-'), '-')
})

test('numbers and money are locale-stable', () => {
  assert.equal(formatNumber(1234567, 'en-US'), '1,234,567')
  assert.equal(formatNumber('42', 'en-US'), '42')
  assert.equal(formatNumber('abc', 'en-US'), 'abc')
  assert.equal(formatMoney(1234.5, { locale: 'en-US' }), '1,234.50')
  assert.equal(formatMoney('12', { currency: 'CNY', locale: 'en-US' }), '12.00 CNY')
  assert.equal(formatMoney(null), '—')
})

test('file sizes use 1024-based units', () => {
  assert.equal(formatFileSize(0), '0 B')
  assert.equal(formatFileSize(512), '512 B')
  assert.equal(formatFileSize(1536), '1.5 KB')
  assert.equal(formatFileSize(10 * 1024 * 1024), '10 MB')
})

test('initials handle emails, names and single words', () => {
  // Matches the existing email-server helper: first letter of the first two segments.
  assert.equal(initials('demo.operator@arorms.cn'), 'DO')
  assert.equal(initials('Ada Lovelace'), 'AL')
  assert.equal(initials('ada'), 'AD')
  assert.equal(initials(null), '?')
})
