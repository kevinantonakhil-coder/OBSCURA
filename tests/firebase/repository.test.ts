import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'
import { analyzeGhost } from '../../src/analysis'
import { addWorkspaceCaseNote, addWorkspaceMember, createWorkspace, createWorkspaceCase, exportWorkspaceJson, listMemberWorkspaces, listWorkspaceCases, removeWorkspaceMember, restoreWorkspaceJson, saveWorkspaceFinding, updateWorkspaceCase } from '../../src/firebase/repository'

let env: RulesTestEnvironment
const active = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
const suite = active ? describe : describe.skip

suite('Firestore repository workflows', () => {
  let workspaceId = ''
  beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-obscura', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }) })
  beforeEach(async () => {
    await env.clearFirestore()
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'pilotAllowlist/owner-1'), { enabled: true })
      await setDoc(doc(context.firestore(), 'pilotAllowlist/analyst-1'), { enabled: true })
    })
    const ownerDb = env.authenticatedContext('owner-1').firestore()
    const workspace = await createWorkspace(ownerDb, 'owner-1', 'Synthetic repository test', 'Emulator-only fixture data')
    workspaceId = workspace.id
  })
  afterAll(async () => env?.cleanup())

  it('creates a tenant index with workspace owner membership and lists it only for that UID', async () => {
    const ownerDb = env.authenticatedContext('owner-1').firestore()
    const analystDb = env.authenticatedContext('analyst-1').firestore()
    expect(await listMemberWorkspaces(ownerDb, 'owner-1')).toHaveLength(1)
    expect(await listMemberWorkspaces(analystDb, 'analyst-1')).toHaveLength(0)
    await assertFails(listWorkspaceCases(analystDb, workspaceId))
  })

  it('adds an allowlisted analyst and persists a case and sanitized local finding', async () => {
    const ownerDb = env.authenticatedContext('owner-1').firestore()
    const analystDb = env.authenticatedContext('analyst-1').firestore()
    await addWorkspaceMember(ownerDb, workspaceId, 'owner-1', 'analyst-1', 'analyst')
    expect(await listMemberWorkspaces(analystDb, 'analyst-1')).toHaveLength(1)
    const caseId = await createWorkspaceCase(analystDb, workspaceId, 'Safe sample review', 'Synthetic records only', 'GHOST')
    const raw = 'From: confidential.user@example.test\nReturn-Path: <sender@fixture.test>\nAuthentication-Results: spf=fail'
    await saveWorkspaceFinding(analystDb, workspaceId, caseId, 'analyst-1', analyzeGhost('email', raw))
    const records = await listWorkspaceCases(analystDb, workspaceId)
    expect(records[0].findings).toHaveLength(1)
    expect(records[0].findings[0].inputLabel).toContain('input not retained')
    expect(JSON.stringify(records[0].findings[0])).not.toContain('confidential.user')
    await updateWorkspaceCase(analystDb, workspaceId, caseId, 'analyst-1', { status: 'IN REVIEW' })
    expect((await listWorkspaceCases(analystDb, workspaceId))[0].status).toBe('IN REVIEW')
  })

  it('creates cases for all four engines and records each creation', async () => {
    const ownerDb = env.authenticatedContext('owner-1').firestore()
    for (const engine of ['GHOST', 'MIRAGE', 'PHANTOM', 'QUANTUM']) {
      const caseId = await createWorkspaceCase(ownerDb, workspaceId, 'Engine coverage', 'Synthetic only', engine)
      expect((await listWorkspaceCases(ownerDb, workspaceId)).find(item => item.id === caseId)?.leadEngine).toBe(engine)
    }
  })

  it('removes an analyst membership and their discovery index in one audited action', async () => {
    const ownerDb = env.authenticatedContext('owner-1').firestore()
    const analystDb = env.authenticatedContext('analyst-1').firestore()
    await addWorkspaceMember(ownerDb, workspaceId, 'owner-1', 'analyst-1', 'analyst')
    expect(await listMemberWorkspaces(analystDb, 'analyst-1')).toHaveLength(1)
    await removeWorkspaceMember(ownerDb, workspaceId, 'owner-1', 'analyst-1')
    expect(await listMemberWorkspaces(analystDb, 'analyst-1')).toHaveLength(0)
  })

  it('exports and restores a validated copy into a new workspace without importing memberships', async () => {
    const ownerDb = env.authenticatedContext('owner-1').firestore()
    const caseId = await createWorkspaceCase(ownerDb, workspaceId, 'Hash demonstration', 'Synthetic only', 'QUANTUM')
    await saveWorkspaceFinding(ownerDb, workspaceId, caseId, 'owner-1', {
      id: 'F-1', engine: 'QUANTUM', title: 'Toy signature example', createdAt: new Date().toISOString(), priority: 'INFO',
      summary: 'Ephemeral educational signature test.', inputLabel: 'not retained', checks: [{ id: 'C-1', title: 'Signature', state: 'PASS', detail: 'Verified locally.', source: 'Web Crypto' }],
    })
    const source = (await listMemberWorkspaces(ownerDb, 'owner-1'))[0]
    const serialized = await exportWorkspaceJson(ownerDb, source)
    const restored = await restoreWorkspaceJson(ownerDb, 'owner-1', serialized)
    const copies = await listWorkspaceCases(ownerDb, restored.id)
    expect(restored.id).not.toBe(workspaceId)
    expect(copies).toHaveLength(1)
    expect(copies[0].findings[0].engine).toBe('QUANTUM')
  })

  it('enforces only valid transitions through the repository', async () => {
    const ownerDb = env.authenticatedContext('owner-1').firestore()
    const caseId = await createWorkspaceCase(ownerDb, workspaceId, 'Lifecycle test', 'Synthetic only', 'GHOST')
    await expect(updateWorkspaceCase(ownerDb, workspaceId, caseId, 'owner-1', { status: 'CLOSED' })).rejects.toThrow(/Cases can move/i)
  })

  it('stores immutable bounded notes and includes them in backup and restore', async () => {
    const ownerDb = env.authenticatedContext('owner-1').firestore()
    const caseId = await createWorkspaceCase(ownerDb, workspaceId, 'Notes workflow', 'Synthetic only', 'PHANTOM')
    await addWorkspaceCaseNote(ownerDb, workspaceId, caseId, 'owner-1', 'Synthetic handle review requested.')
    const source = (await listMemberWorkspaces(ownerDb, 'owner-1'))[0]
    const exported = await exportWorkspaceJson(ownerDb, source)
    const copy = await restoreWorkspaceJson(ownerDb, 'owner-1', exported)
    const restoredCases = await listWorkspaceCases(ownerDb, copy.id)
    expect(restoredCases[0].notes).toHaveLength(1)
    expect(restoredCases[0].notes[0]).toContain('Synthetic handle review requested.')
    await expect(addWorkspaceCaseNote(ownerDb, workspaceId, caseId, 'owner-1', 'x'.repeat(1001))).rejects.toThrow(/1–1000/)
  })
})
