import {
  collection, doc, getDoc, getDocs, limit, orderBy, query,
  serverTimestamp, setDoc, Timestamp, writeBatch, type Firestore,
} from 'firebase/firestore'
import type { CaseRecord, Finding } from '../demo'
import { canTransitionCase, cleanCaseDocument, cleanFindingDocument, isCaseDocument, isFindingDocument, isMemberRecord, isWorkspaceRecord, type ActivityDocument, type CaseDocument, type CaseStatus, type MemberRecord, type ReviewPriority, type WorkspaceRecord, type WorkspaceRole } from './schema'

const dateString = (value: unknown) => value instanceof Timestamp ? value.toDate().toISOString() : new Date(String(value)).toISOString()
export function nextTimestampAfter(value: unknown): Timestamp {
  const previousMillis = value instanceof Timestamp ? value.toMillis() : Date.parse(String(value))
  const current = Timestamp.now()
  return Number.isFinite(previousMillis) && current.toMillis() <= previousMillis
    ? Timestamp.fromMillis(previousMillis + 1)
    : current
}
const toCase = (id: string, data: CaseDocument, findings: Finding[] = [], notes: string[] = []): CaseRecord => ({
  id, title: data.title, purpose: data.purpose, leadEngine: data.leadEngine, status: data.status, priority: data.priority,
  createdAt: dateString(data.createdAt), updatedAt: dateString(data.updatedAt), findings, evidence: findings.map(item => ({
    id: item.id, title: item.title, type: item.engine, addedAt: item.createdAt, summary: item.summary, digest: item.digest,
  })), notes,
})

export type WorkspaceSummary = WorkspaceRecord & { id: string; role: WorkspaceRole }
export type WorkspaceCaseNote = { id: string; authorUid: string; body: string; createdAt: string }

export async function listMemberWorkspaces(db: Firestore, uid: string): Promise<WorkspaceSummary[]> {
  const indexes = await getDocs(query(collection(db, 'users', uid, 'workspaces'), orderBy('createdAt', 'desc'), limit(100)))
  const result = await Promise.all(indexes.docs.map(async indexDoc => {
    const index = indexDoc.data()
    if (index.workspaceId !== indexDoc.id || !(index.createdAt instanceof Timestamp)) throw new Error('A workspace index record has an unsupported format.')
    const snapshot = await getDoc(doc(db, 'workspaces', indexDoc.id))
    const memberDoc = await getDoc(doc(db, 'workspaces', indexDoc.id, 'members', uid))
    const workspace = snapshot.data()
    const member = memberDoc.data()
    if (!snapshot.exists() || !isWorkspaceRecord(workspace) || !memberDoc.exists() || !isMemberRecord(member)) return null
    return { ...workspace, createdAt: dateString(workspace.createdAt), updatedAt: dateString(workspace.updatedAt), id: snapshot.id, role: member.role }
  }))
  return result.filter((item): item is WorkspaceSummary => item !== null)
}

export async function createWorkspace(db: Firestore, uid: string, name: string, purpose: string): Promise<WorkspaceSummary> {
  const now = Timestamp.now()
  const workspaceRef = doc(collection(db, 'workspaces'))
  const workspace: WorkspaceRecord = { name: name.trim(), purpose: purpose.trim(), ownerUid: uid, createdAt: now.toDate().toISOString(), updatedAt: now.toDate().toISOString(), schemaVersion: 1 }
  if (!isWorkspaceRecord(workspace)) throw new Error('Workspace details exceed the supported fields or length limits.')
  const batch = writeBatch(db)
  batch.set(workspaceRef, { ...workspace, createdAt: now, updatedAt: now })
  const membership: MemberRecord = { uid, role: 'owner', status: 'active', invitedBy: uid, createdAt: now.toDate().toISOString() }
  batch.set(doc(db, 'workspaces', workspaceRef.id, 'members', uid), { ...membership, createdAt: now })
  batch.set(doc(db, 'users', uid, 'workspaces', workspaceRef.id), { workspaceId: workspaceRef.id, createdAt: now })
  batch.set(doc(collection(db, 'workspaces', workspaceRef.id, 'activity')), { actorUid: uid, action: 'WORKSPACE_CREATED', targetId: workspaceRef.id, createdAt: serverTimestamp() })
  await batch.commit()
  return { ...workspace, id: workspaceRef.id, role: 'owner' }
}

export async function addWorkspaceMember(db: Firestore, workspaceId: string, actorUid: string, uid: string, role: 'analyst' | 'reviewer'): Promise<void> {
  const now = Timestamp.now()
  const membership: MemberRecord = { uid: uid.trim(), role, status: 'active', invitedBy: actorUid, createdAt: now.toDate().toISOString() }
  if (!isMemberRecord(membership)) throw new Error('Enter a valid Firebase UID.')
  const batch = writeBatch(db)
  batch.set(doc(db, 'workspaces', workspaceId, 'members', membership.uid), { ...membership, createdAt: now })
  batch.set(doc(db, 'users', membership.uid, 'workspaces', workspaceId), { workspaceId, createdAt: now })
  batch.set(doc(collection(db, 'workspaces', workspaceId, 'activity')), { actorUid, action: 'MEMBER_ADDED', targetId: membership.uid, createdAt: serverTimestamp() })
  await batch.commit()
}

export async function listWorkspaceMembers(db: Firestore, workspaceId: string): Promise<MemberRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'workspaces', workspaceId, 'members'), orderBy('createdAt', 'asc'), limit(100)))
  return snapshot.docs.map(item => {
    const member = item.data()
    if (!isMemberRecord(member)) throw new Error('A workspace membership record has an unsupported format.')
    return member
  })
}

export async function listWorkspaceCases(db: Firestore, workspaceId: string): Promise<CaseRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'workspaces', workspaceId, 'cases'), orderBy('createdAt', 'desc'), limit(500)))
  return Promise.all(snapshot.docs.map(async item => {
    const data = item.data()
    if (!isCaseDocument(data)) throw new Error('A saved case has an unsupported format.')
    const findingsSnapshot = await getDocs(query(collection(db, 'workspaces', workspaceId, 'cases', item.id, 'findings'), orderBy('createdAt', 'desc'), limit(200)))
    const findings = findingsSnapshot.docs.map(findingDoc => {
      const finding = findingDoc.data()
      if (!isFindingDocument(finding)) throw new Error('A saved finding has an unsupported format.')
      return { id: findingDoc.id, engine: finding.engine, title: finding.title, createdAt: dateString(finding.createdAt), priority: finding.priority, summary: finding.summary, inputLabel: finding.inputLabel, checks: finding.checks, digest: finding.digest } as Finding
    })
    const notesSnapshot = await getDocs(query(collection(db, 'workspaces', workspaceId, 'cases', item.id, 'notes'), orderBy('createdAt', 'asc'), limit(50)))
    const notes = notesSnapshot.docs.map(noteDoc => {
      const note = noteDoc.data()
      if (typeof note.authorUid !== 'string' || typeof note.body !== 'string' || !(note.createdAt instanceof Timestamp)) throw new Error('A case note has an unsupported format.')
      return `${note.authorUid} · ${dateString(note.createdAt)} · ${note.body}`
    })
    return toCase(item.id, data, findings, notes)
  }))
}

export async function createWorkspaceCase(db: Firestore, workspaceId: string, uid: string, title: string, purpose: string, engine: string): Promise<string> {
  const now = Timestamp.now()
  const record = cleanCaseDocument({ title, purpose, leadEngine: engine, uid, now: now.toDate().toISOString() })
  const caseRef = doc(collection(db, 'workspaces', workspaceId, 'cases'))
  const batch = writeBatch(db)
  batch.set(caseRef, { ...record, createdAt: now, updatedAt: now })
  batch.set(doc(collection(db, 'workspaces', workspaceId, 'activity')), { actorUid: uid, action: 'CASE_CREATED', targetId: caseRef.id, createdAt: serverTimestamp() })
  await batch.commit()
  return caseRef.id
}

export async function updateWorkspaceCase(db: Firestore, workspaceId: string, caseId: string, uid: string, update: Partial<CaseRecord>): Promise<void> {
  const caseRef = doc(db, 'workspaces', workspaceId, 'cases', caseId)
  const snapshot = await getDoc(caseRef)
  const current = snapshot.data()
  if (!snapshot.exists() || !isCaseDocument(current)) throw new Error('This case no longer exists or has an unsupported format.')
  const now = nextTimestampAfter(snapshot.get('updatedAt'))
  const next = cleanCaseDocument({ title: update.title ?? current.title, purpose: update.purpose ?? current.purpose,
    leadEngine: update.leadEngine ?? current.leadEngine, status: update.status ?? current.status,
    priority: update.priority ?? current.priority, uid: current.createdBy, now: now.toDate().toISOString() })
  if (!canTransitionCase(current.status, next.status)) {
    throw new Error('Cases can move from Open to In review, In review to Closed, or Closed back to In review.')
  }
  const batch = writeBatch(db)
  batch.update(caseRef, { title: next.title, purpose: next.purpose, leadEngine: next.leadEngine, status: next.status, priority: next.priority, updatedAt: now })
  batch.set(doc(collection(db, 'workspaces', workspaceId, 'activity')), { actorUid: uid, action: 'CASE_UPDATED', targetId: caseId, createdAt: serverTimestamp() })
  await batch.commit()
}

export async function addWorkspaceCaseNote(db: Firestore, workspaceId: string, caseId: string, uid: string, body: string): Promise<void> {
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 1000) throw new Error('A case note must contain 1–1000 characters.')
  const caseRef = doc(db, 'workspaces', workspaceId, 'cases', caseId)
  const snapshot = await getDoc(caseRef)
  if (!snapshot.exists() || !isCaseDocument(snapshot.data())) throw new Error('This case no longer exists or has an unsupported format.')
  const noteRef = doc(collection(db, 'workspaces', workspaceId, 'cases', caseId, 'notes'))
  const batch = writeBatch(db)
  batch.set(noteRef, { authorUid: uid, body: trimmed, createdAt: serverTimestamp() })
  batch.set(doc(collection(db, 'workspaces', workspaceId, 'activity')), { actorUid: uid, action: 'CASE_NOTE_ADDED', targetId: caseId, noteId: noteRef.id, createdAt: serverTimestamp() })
  await batch.commit()
}

export async function removeWorkspaceMember(db: Firestore, workspaceId: string, actorUid: string, uid: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'workspaces', workspaceId, 'members', uid))
  batch.delete(doc(db, 'users', uid, 'workspaces', workspaceId))
  batch.set(doc(collection(db, 'workspaces', workspaceId, 'activity')), { actorUid, action: 'MEMBER_REMOVED', targetId: uid, createdAt: serverTimestamp() })
  await batch.commit()
}

export async function saveWorkspaceFinding(db: Firestore, workspaceId: string, caseId: string, uid: string, finding: Finding): Promise<void> {
  const record = buildPersistedFinding(finding, uid)
  const caseRef = doc(db, 'workspaces', workspaceId, 'cases', caseId)
  const caseSnapshot = await getDoc(caseRef)
  const caseRecord = caseSnapshot.data()
  if (!caseSnapshot.exists() || !isCaseDocument(caseRecord)) throw new Error('This case no longer exists or has an unsupported format.')
  const now = nextTimestampAfter(caseSnapshot.get('updatedAt'))
  const batch = writeBatch(db)
  const findingRef = doc(collection(db, 'workspaces', workspaceId, 'cases', caseId, 'findings'))
  batch.set(findingRef, { ...record, createdAt: Timestamp.fromDate(new Date(record.createdAt)) })
  batch.update(caseRef, { leadEngine: finding.engine, priority: finding.priority, updatedAt: now })
  batch.set(doc(collection(db, 'workspaces', workspaceId, 'activity')), { actorUid: uid, action: 'FINDING_SAVED', targetId: caseId, findingId: findingRef.id, createdAt: serverTimestamp() })
  await batch.commit()
}

export function buildPersistedFinding(finding: Finding, uid: string) {
  const inputLabel = finding.engine === 'GHOST' ? 'text reviewed locally · input not retained'
    : finding.engine === 'MIRAGE' ? 'image reviewed locally · file bytes not retained'
      : finding.engine === 'PHANTOM' ? 'public text reviewed locally · input not retained'
        : 'local cryptographic demonstration · source not retained'
  return cleanFindingDocument({ engine: finding.engine, title: finding.title, createdBy: uid, createdAt: finding.createdAt,
    priority: finding.priority, summary: finding.summary, inputLabel, checks: finding.checks, digest: finding.digest })
}

export async function recordReviewDecision(db: Firestore, workspaceId: string, caseId: string, uid: string): Promise<void> {
  await setDoc(doc(collection(db, 'workspaces', workspaceId, 'activity')), { actorUid: uid, action: 'REVIEW_ACKNOWLEDGED', targetId: caseId, createdAt: serverTimestamp() })
}

export async function listWorkspaceActivity(db: Firestore, workspaceId: string): Promise<ActivityDocument[]> {
  const snapshot = await getDocs(query(collection(db, 'workspaces', workspaceId, 'activity'), orderBy('createdAt', 'desc'), limit(50)))
  return snapshot.docs.map(item => {
    const event = item.data()
    if (typeof event.actorUid !== 'string' || typeof event.action !== 'string' || typeof event.targetId !== 'string' || !(event.createdAt instanceof Timestamp)) throw new Error('An activity record has an unsupported format.')
    return { actorUid: event.actorUid, action: event.action, targetId: event.targetId, createdAt: dateString(event.createdAt) }
  })
}

export async function exportWorkspaceJson(db: Firestore, workspace: WorkspaceSummary): Promise<string> {
  const [cases, members] = await Promise.all([listWorkspaceCases(db, workspace.id), listWorkspaceMembers(db, workspace.id)])
  const bounded = cases.map(({ id, title, purpose, leadEngine, status, priority, createdAt, updatedAt, findings, notes }) => ({ id, title, purpose, leadEngine, status, priority, createdAt, updatedAt, findings, notes }))
  return JSON.stringify({ format: 'obscura-workspace-export', version: 1, exportedAt: new Date().toISOString(), workspace: { id: workspace.id, name: workspace.name, purpose: workspace.purpose }, members: members.map(({ uid, role, status }) => ({ uid, role, status })), cases: bounded }, null, 2)
}

type BackupCase = { title: string; purpose: string; leadEngine: string; status: CaseStatus; priority: ReviewPriority; findings: Finding[]; notes: string[] }
export function parseWorkspaceBackup(serialized: string): { name: string; purpose: string; cases: BackupCase[] } {
  if (serialized.length > 5_000_000) throw new Error('The backup file is larger than the 5 MB limit.')
  let value: unknown
  try { value = JSON.parse(serialized) } catch { throw new Error('This file is not valid JSON.') }
  if (!value || typeof value !== 'object') throw new Error('This is not an OBSCURA workspace export.')
  const root = value as Record<string, unknown>
  if (root.format !== 'obscura-workspace-export' || root.version !== 1 || !root.workspace || typeof root.workspace !== 'object' || !Array.isArray(root.cases) || root.cases.length > 500) {
    throw new Error('This file is not a supported OBSCURA workspace export.')
  }
  const workspace = root.workspace as Record<string, unknown>
  if (typeof workspace.name !== 'string' || workspace.name.length > 80 || typeof workspace.purpose !== 'string' || workspace.purpose.length > 500) throw new Error('Workspace details in this backup are invalid.')
  const cases = root.cases.map((item): BackupCase => {
    if (!item || typeof item !== 'object') throw new Error('A case record in this backup is invalid.')
    const record = item as Record<string, unknown>
    if (Object.keys(record).some(key => !['id','title','purpose','leadEngine','status','priority','createdAt','updatedAt','findings','notes'].includes(key)) ||
      typeof record.title !== 'string' || typeof record.purpose !== 'string' || typeof record.leadEngine !== 'string' ||
      !['OPEN','IN REVIEW','CLOSED'].includes(String(record.status)) || !['HIGH','REVIEW','INFO'].includes(String(record.priority)) ||
      !Array.isArray(record.findings) || record.findings.length > 200) throw new Error('A case record exceeds the supported fields or size limits.')
    if (record.notes !== undefined && (!Array.isArray(record.notes) || record.notes.length > 50 || record.notes.some(note => typeof note !== 'string' || note.length > 1200))) throw new Error('Case notes in this backup exceed the supported limits.')
    const validatedCase = cleanCaseDocument({ title: record.title, purpose: record.purpose, leadEngine: record.leadEngine, uid: 'restore-check', now: new Date().toISOString() })
    const findings = record.findings.map((raw): Finding => {
      if (!raw || typeof raw !== 'object') throw new Error('A finding in this backup is invalid.')
      const source = raw as Record<string, unknown>
      const finding = {
        engine: source.engine, title: source.title, createdBy: 'restore-check', createdAt: source.createdAt,
        priority: source.priority, summary: source.summary, inputLabel: source.inputLabel, checks: source.checks,
        digest: source.digest, synthetic: true,
      }
      if (Object.keys(source).some(key => !['id','engine','title','createdAt','priority','summary','inputLabel','checks','digest'].includes(key)) || !isFindingDocument(finding)) throw new Error('A finding exceeds the supported fields or size limits.')
      return { id: typeof source.id === 'string' ? source.id : 'imported', engine: finding.engine as Finding['engine'], title: finding.title as string, createdAt: String(finding.createdAt), priority: finding.priority as ReviewPriority, summary: finding.summary as string, inputLabel: finding.inputLabel as string, checks: finding.checks as Finding['checks'], digest: typeof finding.digest === 'string' ? finding.digest : undefined }
    })
    return { title: validatedCase.title, purpose: validatedCase.purpose, leadEngine: validatedCase.leadEngine, status: record.status as CaseStatus, priority: record.priority as ReviewPriority, findings, notes: (record.notes as string[] | undefined) ?? [] }
  })
  return { name: workspace.name, purpose: workspace.purpose, cases }
}

export async function restoreWorkspaceJson(db: Firestore, uid: string, serialized: string): Promise<WorkspaceSummary> {
  const backup = parseWorkspaceBackup(serialized)
  const workspace = await createWorkspace(db, uid, `${backup.name.slice(0, 70)} (restored)`, backup.purpose)
  for (const item of backup.cases) {
    const id = await createWorkspaceCase(db, workspace.id, uid, item.title, item.purpose, item.leadEngine)
    if (item.status !== 'OPEN') await updateWorkspaceCase(db, workspace.id, id, uid, { status: 'IN REVIEW' })
    if (item.status === 'CLOSED') await updateWorkspaceCase(db, workspace.id, id, uid, { status: 'CLOSED' })
    for (const finding of item.findings) await saveWorkspaceFinding(db, workspace.id, id, uid, finding)
    for (const note of item.notes) await addWorkspaceCaseNote(db, workspace.id, id, uid, note.replace(/^.*? · .*? · /, ''))
    if (item.priority !== 'INFO') await updateWorkspaceCase(db, workspace.id, id, uid, { priority: item.priority })
  }
  return workspace
}
