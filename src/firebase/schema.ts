export type WorkspaceRole = 'owner' | 'admin' | 'analyst' | 'reviewer'
export type CaseStatus = 'OPEN' | 'IN REVIEW' | 'CLOSED'
export type ReviewPriority = 'HIGH' | 'REVIEW' | 'INFO'
export type Engine = 'GHOST' | 'MIRAGE' | 'PHANTOM' | 'QUANTUM'
export type WorkspaceRecord = {
  name: string
  purpose: string
  ownerUid: string
  createdAt: string
  updatedAt: string
  schemaVersion: 1
}
export type MemberRecord = {
  uid: string
  role: WorkspaceRole
  status: 'active'
  invitedBy: string
  createdAt: string
}
export type CaseDocument = {
  title: string
  purpose: string
  leadEngine: Engine | 'UNASSIGNED'
  status: CaseStatus
  priority: ReviewPriority
  createdBy: string
  createdAt: string
  updatedAt: string
  synthetic: true
}
export type FindingCheck = { id: string; title: string; state: 'PASS' | 'SIGNAL' | 'UNKNOWN' | 'UNAVAILABLE'; detail: string; source: string }
export type FindingDocument = {
  engine: Engine
  title: string
  createdBy: string
  createdAt: string
  priority: ReviewPriority
  summary: string
  inputLabel: string
  checks: FindingCheck[]
  digest?: string
  synthetic: true
}
export type ActivityDocument = {
  actorUid: string
  action: string
  targetId: string
  createdAt: string
}

const plainObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const boundedString = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const dateValue = (value: unknown) => typeof value === 'string' && value.length <= 40 || plainObject(value) && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number'
const enumValue = <T extends string>(value: unknown, options: readonly T[]): value is T => typeof value === 'string' && options.includes(value as T)
export const roles: readonly WorkspaceRole[] = ['owner', 'admin', 'analyst', 'reviewer']
export const caseStatuses: readonly CaseStatus[] = ['OPEN', 'IN REVIEW', 'CLOSED']
export const priorities: readonly ReviewPriority[] = ['HIGH', 'REVIEW', 'INFO']
export const engines: readonly Engine[] = ['GHOST', 'MIRAGE', 'PHANTOM', 'QUANTUM']

export function isWorkspaceRecord(value: unknown): value is WorkspaceRecord {
  if (!plainObject(value)) return false
  return Object.keys(value).every(key => ['name','purpose','ownerUid','createdAt','updatedAt','schemaVersion'].includes(key)) &&
    boundedString(value.name, 80) && typeof value.purpose === 'string' && value.purpose.length <= 500 &&
    boundedString(value.ownerUid, 128) && dateValue(value.createdAt) && dateValue(value.updatedAt) && value.schemaVersion === 1
}

export function isMemberRecord(value: unknown): value is MemberRecord {
  if (!plainObject(value)) return false
  return Object.keys(value).every(key => ['uid','role','status','invitedBy','createdAt'].includes(key)) &&
    boundedString(value.uid, 128) && enumValue(value.role, roles) && value.status === 'active' &&
    boundedString(value.invitedBy, 128) && dateValue(value.createdAt)
}

export function isCaseDocument(value: unknown): value is CaseDocument {
  if (!plainObject(value)) return false
  return Object.keys(value).every(key => ['title','purpose','leadEngine','status','priority','createdBy','createdAt','updatedAt','synthetic'].includes(key)) &&
    boundedString(value.title, 120) && typeof value.purpose === 'string' && value.purpose.length <= 500 &&
    enumValue(value.leadEngine, [...engines, 'UNASSIGNED']) && enumValue(value.status, caseStatuses) && enumValue(value.priority, priorities) &&
    boundedString(value.createdBy, 128) && dateValue(value.createdAt) && dateValue(value.updatedAt) && value.synthetic === true
}

export function isFindingDocument(value: unknown): value is FindingDocument {
  if (!plainObject(value) || !Array.isArray(value.checks) || value.checks.length > 12) return false
  const checks = value.checks.every(check => plainObject(check) && Object.keys(check).every(key => ['id','title','state','detail','source'].includes(key)) &&
    boundedString(check.id, 40) && boundedString(check.title, 120) && enumValue(check.state, ['PASS','SIGNAL','UNKNOWN','UNAVAILABLE']) &&
    boundedString(check.detail, 500) && boundedString(check.source, 120))
  return Object.keys(value).every(key => ['engine','title','createdBy','createdAt','priority','summary','inputLabel','checks','digest','synthetic'].includes(key)) &&
    enumValue(value.engine, engines) && boundedString(value.title, 120) && boundedString(value.createdBy, 128) && boundedString(value.createdAt, 40) &&
    enumValue(value.priority, priorities) && boundedString(value.summary, 1000) && boundedString(value.inputLabel, 200) && checks && value.synthetic === true && dateValue(value.createdAt) &&
    (value.digest === undefined || (typeof value.digest === 'string' && /^[a-f0-9]{64}$/i.test(value.digest)))
}

export function canTransitionCase(from: CaseStatus, to: CaseStatus): boolean {
  return from === to || (from === 'OPEN' && to === 'IN REVIEW') || (from === 'IN REVIEW' && to === 'CLOSED') || (from === 'CLOSED' && to === 'IN REVIEW')
}

export function cleanCaseDocument(input: { title: string; purpose: string; leadEngine: string; status?: CaseStatus; priority?: ReviewPriority; uid: string; now: string }): CaseDocument {
  const value: CaseDocument = {
    title: input.title.trim(), purpose: input.purpose.trim(),
    leadEngine: enumValue(input.leadEngine, [...engines, 'UNASSIGNED']) ? input.leadEngine : 'UNASSIGNED',
    status: input.status ?? 'OPEN', priority: input.priority ?? 'INFO', createdBy: input.uid,
    createdAt: input.now, updatedAt: input.now, synthetic: true,
  }
  if (!isCaseDocument(value)) throw new Error('Case details exceed the supported fields or length limits.')
  return value
}

export function cleanFindingDocument(input: Omit<FindingDocument, 'createdBy' | 'createdAt' | 'synthetic'> & { createdBy: string; createdAt: string }): FindingDocument {
  const value: FindingDocument = { ...input, synthetic: true }
  if (!isFindingDocument(value)) throw new Error('Finding details exceed the supported fields or length limits.')
  return value
}
