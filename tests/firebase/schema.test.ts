import { describe, expect, it } from 'vitest'
import { canTransitionCase, cleanCaseDocument, isCaseDocument, isFindingDocument } from '../../src/firebase/schema'

const baseCase = {
  title: 'Synthetic domain review', purpose: 'Training example only', leadEngine: 'GHOST', status: 'OPEN', priority: 'INFO',
  createdBy: 'pilot-uid', createdAt: '2026-11-15T00:00:00.000Z', updatedAt: '2026-11-15T00:00:00.000Z', synthetic: true,
}

describe('Firebase document schema', () => {
  it('accepts a bounded synthetic case and rejects unknown fields', () => {
    expect(isCaseDocument(baseCase)).toBe(true)
    expect(isCaseDocument({ ...baseCase, rawEmail: 'private content' })).toBe(false)
  })

  it('rejects invalid or oversized case fields before sending them to Firestore', () => {
    expect(() => cleanCaseDocument({ title: 'x'.repeat(121), purpose: '', leadEngine: 'GHOST', uid: 'u', now: new Date().toISOString() }))
      .toThrow(/supported fields or length limits/i)
  })

  it('allows only the defined case lifecycle transitions', () => {
    expect(canTransitionCase('OPEN', 'IN REVIEW')).toBe(true)
    expect(canTransitionCase('IN REVIEW', 'CLOSED')).toBe(true)
    expect(canTransitionCase('CLOSED', 'IN REVIEW')).toBe(true)
    expect(canTransitionCase('OPEN', 'CLOSED')).toBe(false)
  })

  it('rejects findings with unbounded or unknown data', () => {
    const finding = {
      engine: 'GHOST', title: 'Review signal', createdBy: 'pilot-uid', createdAt: new Date().toISOString(), priority: 'REVIEW',
      summary: 'Synthetic signal only.', inputLabel: 'fixture.example', checks: [{ id: 'c1', title: 'Check', state: 'UNKNOWN', detail: 'No live lookup', source: 'Local rule' }], synthetic: true,
    }
    expect(isFindingDocument(finding)).toBe(true)
    expect(isFindingDocument({ ...finding, checks: Array.from({ length: 13 }, (_, i) => ({ ...finding.checks[0], id: String(i) })) })).toBe(false)
    expect(isFindingDocument({ ...finding, attachmentBytes: 'x' })).toBe(false)
  })
})
