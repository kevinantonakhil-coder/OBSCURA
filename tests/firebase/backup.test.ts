import { describe, expect, it } from 'vitest'
import { parseWorkspaceBackup } from '../../src/firebase/repository'

const backup = (notes: string[]) => JSON.stringify({
  format: 'obscura-workspace-export', version: 1,
  workspace: { name: 'Synthetic workspace', purpose: 'Demo only' },
  cases: [{ title: 'Training case', purpose: 'Synthetic', leadEngine: 'PHANTOM', status: 'OPEN', priority: 'INFO', findings: [], notes }],
})

describe('Firebase workspace backup notes', () => {
  it('preserves bounded notes for restore', () => {
    expect(parseWorkspaceBackup(backup(['Synthetic note'])).cases[0].notes).toEqual(['Synthetic note'])
  })

  it('rejects oversized or excessive notes', () => {
    expect(() => parseWorkspaceBackup(backup(['x'.repeat(1201)]))).toThrow(/Case notes/)
    expect(() => parseWorkspaceBackup(backup(Array.from({ length: 51 }, () => 'Synthetic note')))).toThrow(/Case notes/)
  })
})
