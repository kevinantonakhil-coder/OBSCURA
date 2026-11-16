import { describe, expect, it } from 'vitest'
import { analyzePhantom, createToyZkFinding, runToyZkProof } from '../../src/advancedAnalysis'
import { analyzeGhost } from '../../src/analysis'
import { buildPersistedFinding } from '../../src/firebase/repository'

describe('PHANTOM and QUANTUM local demonstrations', () => {
  it('returns explainable text-only brand signals without retaining the submitted profile text', () => {
    const finding = analyzePhantom('Northstar', '@northstar_support')
    const persisted = buildPersistedFinding(finding, 'pilot-uid')
    expect(finding.engine).toBe('PHANTOM')
    expect(finding.checks.some(check => check.state === 'SIGNAL')).toBe(true)
    expect(finding.inputLabel).not.toContain('northstar_support')
    expect(finding.summary).not.toContain('northstar_support')
    expect(JSON.stringify(persisted)).not.toContain('northstar_support')
    expect(persisted.inputLabel).toContain('input not retained')
    expect(finding.checks.some(check => /face|identity recognition/i.test(check.title))).toBe(false)
  })

  it('verifies the toy zero-knowledge protocol response and rejects a tampered response', () => {
    const proof = runToyZkProof(7, 3, 5)
    expect(proof.verified).toBe(true)
    expect(runToyZkProof(7, 3, 5, proof.response + 1).verified).toBe(false)
    expect(proof.groupSize).toBe(11)
  })

  it('persists only the educational QUANTUM summary and public demonstration values', () => {
    const persisted = buildPersistedFinding(createToyZkFinding(), 'pilot-uid')
    expect(persisted.engine).toBe('QUANTUM')
    expect(persisted.inputLabel).toContain('source not retained')
    expect(persisted.summary).toContain('deliberately insecure')
  })

  it('rejects secrets or challenges outside the demonstration group', () => {
    expect(() => runToyZkProof(0, 3, 5)).toThrow(/range/i)
    expect(() => runToyZkProof(7, 3, 11)).toThrow(/range/i)
  })

  it('strips submitted GHOST input text from the Firebase persistence payload', () => {
    const raw = 'From: private.person@example.test\nReturn-Path: <bounce@sample.test>\nAuthentication-Results: spf=fail'
    const persisted = buildPersistedFinding(analyzeGhost('email', raw), 'pilot-uid')
    expect(JSON.stringify(persisted)).not.toContain('private.person')
    expect(persisted.inputLabel).toContain('input not retained')
  })
})
