import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore'

let env: RulesTestEnvironment
const rulesSuite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip
const projectId = 'demo-obscura'
const now = Timestamp.fromDate(new Date('2026-11-15T00:00:00.000Z'))
const workspace = { name: 'Synthetic pilot', purpose: 'Training only', ownerUid: 'owner-1', createdAt: now, updatedAt: now, schemaVersion: 1 }
const member = (uid: string, role: string) => ({ uid, role, status: 'active', invitedBy: 'owner-1', createdAt: now })
const caseData = { title: 'Training case', purpose: 'Synthetic only', leadEngine: 'GHOST', status: 'OPEN', priority: 'INFO', createdBy: 'owner-1', createdAt: now, updatedAt: now, synthetic: true }
const findingData = { engine: 'GHOST', title: 'Training signal', createdBy: 'owner-1', createdAt: now, priority: 'REVIEW', summary: 'Synthetic result only.', inputLabel: 'fixture.example', checks: [{ id: 'c1', title: 'Header format', state: 'UNKNOWN', detail: 'No external lookup.', source: 'Local check' }], synthetic: true }

rulesSuite('Firestore security rules', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
  })
  beforeEach(async () => {
    await env.clearFirestore()
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, 'pilotAllowlist/owner-1'), { enabled: true })
      await setDoc(doc(db, 'pilotAllowlist/analyst-1'), { enabled: true })
      await setDoc(doc(db, 'pilotAllowlist/reviewer-1'), { enabled: true })
      await setDoc(doc(db, 'pilotAllowlist/analyst-new'), { enabled: true })
      await setDoc(doc(db, 'workspaces/ws-a'), workspace)
      await setDoc(doc(db, 'workspaces/ws-a/members/owner-1'), member('owner-1', 'owner'))
      await setDoc(doc(db, 'workspaces/ws-a/members/analyst-1'), { ...member('analyst-1', 'analyst'), invitedBy: 'owner-1' })
      await setDoc(doc(db, 'workspaces/ws-a/members/reviewer-1'), { ...member('reviewer-1', 'reviewer'), invitedBy: 'owner-1' })
      await setDoc(doc(db, 'users/owner-1/workspaces/ws-a'), { workspaceId: 'ws-a', createdAt: now })
      await setDoc(doc(db, 'users/analyst-1/workspaces/ws-a'), { workspaceId: 'ws-a', createdAt: now })
      await setDoc(doc(db, 'users/reviewer-1/workspaces/ws-a'), { workspaceId: 'ws-a', createdAt: now })
      await setDoc(doc(db, 'workspaces/ws-a/cases/case-a'), caseData)
      await setDoc(doc(db, 'workspaces/ws-a/cases/case-a/findings/finding-a'), findingData)
      await setDoc(doc(db, 'workspaces/ws-b'), { ...workspace, ownerUid: 'owner-2' })
      await setDoc(doc(db, 'workspaces/ws-b/members/owner-2'), { ...member('owner-2', 'owner'), invitedBy: 'owner-2' })
      await setDoc(doc(db, 'workspaces/ws-b/cases/case-b'), { ...caseData, createdBy: 'owner-2' })
    })
  })
  afterAll(async () => env?.cleanup())

  it('denies anonymous workspace and allowlist access', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'workspaces/ws-a')))
    await assertFails(getDoc(doc(db, 'pilotAllowlist/owner-1')))
  })

  it('lets a signed-in user check only their own allowlist record and never write it', async () => {
    const db = env.authenticatedContext('outsider-1').firestore()
    await assertSucceeds(getDoc(doc(db, 'pilotAllowlist/outsider-1')))
    await assertFails(setDoc(doc(db, 'pilotAllowlist/outsider-1'), { enabled: true }))
    await assertFails(getDoc(doc(db, 'pilotAllowlist/owner-1')))
  })

  it('revokes workspace access when an operator removes an existing pilot allowlist entry', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await deleteDoc(doc(context.firestore(), 'pilotAllowlist/analyst-1'))
    })
    const db = env.authenticatedContext('analyst-1').firestore()
    await assertFails(getDoc(doc(db, 'workspaces/ws-a')))
    await assertFails(getDocs(collection(db, 'workspaces/ws-a/cases')))
    await assertFails(getDoc(doc(db, 'workspaces/ws-a/members/analyst-1')))
    await assertFails(getDocs(collection(db, 'users/analyst-1/workspaces')))
  })

  it('allows an allowlisted user to atomically create a workspace and owner membership', async () => {
    const db = env.authenticatedContext('owner-1').firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'workspaces/ws-new'), { ...workspace, ownerUid: 'owner-1' })
    batch.set(doc(db, 'workspaces/ws-new/members/owner-1'), { ...member('owner-1', 'owner'), invitedBy: 'owner-1' })
    batch.set(doc(db, 'users/owner-1/workspaces/ws-new'), { workspaceId: 'ws-new', createdAt: now })
    batch.set(doc(db, 'workspaces/ws-new/activity/create-event'), { actorUid: 'owner-1', action: 'WORKSPACE_CREATED', targetId: 'ws-new', createdAt: serverTimestamp() })
    await assertSucceeds(batch.commit())
  })

  it('denies unallowlisted workspace creation and self-assigned owner membership', async () => {
    const db = env.authenticatedContext('outsider-1').firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'workspaces/ws-bad'), { ...workspace, ownerUid: 'outsider-1' })
    batch.set(doc(db, 'workspaces/ws-bad/members/outsider-1'), { ...member('outsider-1', 'owner'), invitedBy: 'outsider-1' })
    await assertFails(batch.commit())
  })

  it('allows members to read cases but denies a cross-workspace member', async () => {
    const analyst = env.authenticatedContext('analyst-1').firestore()
    const outsider = env.authenticatedContext('owner-2').firestore()
    await assertSucceeds(getDoc(doc(analyst, 'workspaces/ws-a/cases/case-a')))
    await assertFails(getDoc(doc(analyst, 'workspaces/ws-b/cases/case-b')))
    await assertFails(getDocs(collection(outsider, 'workspaces/ws-a/cases')))
    await assertSucceeds(getDocs(collection(analyst, 'users/analyst-1/workspaces')))
    await assertFails(getDocs(collection(analyst, 'users/owner-1/workspaces')))
  })

  it('allows an analyst to create bounded synthetic cases and findings', async () => {
    const db = env.authenticatedContext('analyst-1').firestore()
    await assertSucceeds(setDoc(doc(db, 'workspaces/ws-a/cases/case-new'), { ...caseData, createdBy: 'analyst-1' }))
    await assertSucceeds(setDoc(doc(db, 'workspaces/ws-a/cases/case-a/findings/f-1'), { ...findingData, createdBy: 'analyst-1' }))
  })

  it('accepts every implemented engine as a case lead', async () => {
    const db = env.authenticatedContext('analyst-1').firestore()
    for (const leadEngine of ['GHOST', 'MIRAGE', 'PHANTOM', 'QUANTUM']) {
      await assertSucceeds(setDoc(doc(db, `workspaces/ws-a/cases/lead-${leadEngine.toLowerCase()}`), {
        ...caseData, leadEngine, createdBy: 'analyst-1',
      }))
    }
  })

  it('blocks reviewers from changing cases or creating findings but permits append-only activity', async () => {
    const db = env.authenticatedContext('reviewer-1').firestore()
    await assertFails(updateDoc(doc(db, 'workspaces/ws-a/cases/case-a'), { priority: 'HIGH', updatedAt: Timestamp.now() }))
    await assertFails(setDoc(doc(db, 'workspaces/ws-a/cases/case-a/findings/f-review'), { ...findingData, createdBy: 'reviewer-1' }))
    await assertSucceeds(setDoc(doc(db, 'workspaces/ws-a/activity/review-1'), { actorUid: 'reviewer-1', action: 'REVIEW_ACKNOWLEDGED', targetId: 'case-a', createdAt: serverTimestamp() }))
  })

  it('rejects forged audit events and limits review events to reviewers', async () => {
    const analystDb = env.authenticatedContext('analyst-1').firestore()
    const reviewerDb = env.authenticatedContext('reviewer-1').firestore()
    await assertFails(setDoc(doc(analystDb, 'workspaces/ws-a/activity/forged-review'), {
      actorUid: 'analyst-1', action: 'REVIEW_ACKNOWLEDGED', targetId: 'case-a', createdAt: serverTimestamp(),
    }))
    await assertFails(setDoc(doc(reviewerDb, 'workspaces/ws-a/activity/forged-create'), {
      actorUid: 'reviewer-1', action: 'CASE_CREATED', targetId: 'case-a', createdAt: serverTimestamp(),
    }))
    await assertFails(setDoc(doc(analystDb, 'workspaces/ws-a/activity/forged-update'), {
      actorUid: 'analyst-1', action: 'CASE_UPDATED', targetId: 'case-a', createdAt: serverTimestamp(),
    }))
    await assertSucceeds(setDoc(doc(reviewerDb, 'workspaces/ws-a/activity/review-valid'), {
      actorUid: 'reviewer-1', action: 'REVIEW_ACKNOWLEDGED', targetId: 'case-a', createdAt: serverTimestamp(),
    }))
  })

  it('rejects client-chosen future timestamps in otherwise valid audit events', async () => {
    const db = env.authenticatedContext('reviewer-1').firestore()
    await assertFails(setDoc(doc(db, 'workspaces/ws-a/activity/future-review'), {
      actorUid: 'reviewer-1', action: 'REVIEW_ACKNOWLEDGED', targetId: 'case-a',
      createdAt: Timestamp.fromMillis(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }))
    await assertSucceeds(setDoc(doc(db, 'workspaces/ws-a/activity/current-review'), {
      actorUid: 'reviewer-1', action: 'REVIEW_ACKNOWLEDGED', targetId: 'case-a', createdAt: serverTimestamp(),
    }))
  })

  it('allows an analyst to append only bounded immutable notes with a matching audit event', async () => {
    const db = env.authenticatedContext('analyst-1').firestore()
    const batch = writeBatch(db)
    const note = doc(db, 'workspaces/ws-a/cases/case-a/notes/note-1')
    batch.set(note, { authorUid: 'analyst-1', body: 'Synthetic review note.', createdAt: serverTimestamp() })
    batch.set(doc(db, 'workspaces/ws-a/activity/note-event'), { actorUid: 'analyst-1', action: 'CASE_NOTE_ADDED', targetId: 'case-a', noteId: 'note-1', createdAt: serverTimestamp() })
    await assertSucceeds(batch.commit())
    await assertFails(updateDoc(note, { body: 'Edited after the fact' }))
    await assertFails(setDoc(doc(db, 'workspaces/ws-a/cases/case-a/notes/oversized'), {
      authorUid: 'analyst-1', body: 'x'.repeat(1001), createdAt: serverTimestamp(),
    }))
  })

  it('rejects role escalation, unknown fields, invalid state jumps, and oversized input', async () => {
    const ownerDb = env.authenticatedContext('owner-1').firestore()
    const analystDb = env.authenticatedContext('analyst-1').firestore()
    await assertFails(setDoc(doc(ownerDb, 'workspaces/ws-a/members/new-admin'), { ...member('new-admin', 'admin'), invitedBy: 'owner-1' }))
    await assertFails(updateDoc(doc(analystDb, 'workspaces/ws-a/cases/case-a'), { createdBy: 'analyst-1', updatedAt: Timestamp.now() }))
    await assertFails(setDoc(doc(analystDb, 'workspaces/ws-a/cases/bad'), { ...caseData, createdBy: 'analyst-1', notes: ['unknown field'] }))
    await assertFails(setDoc(doc(analystDb, 'workspaces/ws-a/cases/large'), { ...caseData, createdBy: 'analyst-1', title: 'x'.repeat(121) }))
    await assertFails(updateDoc(doc(analystDb, 'workspaces/ws-a/cases/case-a'), { status: 'CLOSED', updatedAt: Timestamp.now() }))
  })

  it('preserves immutable case ownership and finding records', async () => {
    const db = env.authenticatedContext('analyst-1').firestore()
    await assertFails(updateDoc(doc(db, 'workspaces/ws-a/cases/case-a'), { createdBy: 'analyst-1', updatedAt: Timestamp.now() }))
    await assertFails(deleteDoc(doc(db, 'workspaces/ws-a/cases/case-a/findings/f-1')))
    await assertFails(deleteDoc(doc(db, 'workspaces/ws-a/cases/case-a')))
  })

  it('lets an owner add only already-allowlisted analyst or reviewer accounts', async () => {
    const db = env.authenticatedContext('owner-1').firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'workspaces/ws-a/members/analyst-new'), { ...member('analyst-new', 'analyst'), invitedBy: 'owner-1' })
    batch.set(doc(db, 'users/analyst-new/workspaces/ws-a'), { workspaceId: 'ws-a', createdAt: now })
    await assertSucceeds(batch.commit())
    await assertFails(setDoc(doc(db, 'workspaces/ws-a/members/not-approved'), { ...member('not-approved', 'analyst'), invitedBy: 'owner-1' }))
    await assertFails(deleteDoc(doc(db, 'workspaces/ws-a/members/owner-1')))
    await assertFails(updateDoc(doc(db, 'workspaces/ws-a/members/analyst-1'), { role: 'reviewer' }))
  })
})
