export type Role = 'Analyst' | 'Reviewer' | 'Workspace admin'
export type CheckState = 'PASS' | 'SIGNAL' | 'UNKNOWN' | 'UNAVAILABLE'

export type CheckResult = {
  id: string
  title: string
  state: CheckState
  detail: string
  source: string
}

export type Finding = {
  id: string
  engine: 'GHOST' | 'MIRAGE' | 'PHANTOM' | 'QUANTUM'
  title: string
  createdAt: string
  priority: 'HIGH' | 'REVIEW' | 'INFO'
  summary: string
  inputLabel: string
  checks: CheckResult[]
  digest?: string
}

export type EvidenceItem = {
  id: string
  title: string
  type: string
  addedAt: string
  summary: string
  digest?: string
}

export type CaseRecord = {
  id: string
  title: string
  purpose: string
  leadEngine: string
  status: 'OPEN' | 'IN REVIEW' | 'CLOSED'
  priority: 'HIGH' | 'REVIEW' | 'INFO'
  createdAt: string
  updatedAt: string
  findings: Finding[]
  evidence: EvidenceItem[]
  notes: string[]
  seeded?: boolean
}

export type AuditItem = { id: string; at: string; actor: Role; action: string; detail: string }
export type DemoState = {
  version: 1
  role: Role
  cases: CaseRecord[]
  activeCaseId: string
  connectors: Record<string, boolean>
  audit: AuditItem[]
  preferences: { reducedMotion: boolean; compactTables: boolean }
}

export const STORAGE_KEY = 'obscura-demo-v1'
const now = '2026-11-14T08:30:00.000Z'

export const connectorCatalog = [
  { id: 'attack', name: 'MITRE ATT&CK', category: 'Knowledge base', description: 'Technique and tactic references for analyst context.', mode: 'Bundled fixture · no feed connection' },
  { id: 'domain-reputation', name: 'Domain reputation', category: 'Threat intelligence', description: 'A safe sample result set for demonstrating indicator enrichment.', mode: 'Synthetic records · no DNS or URL requests' },
  { id: 'mail-signals', name: 'Mail signal examples', category: 'Threat intelligence', description: 'Inert email-header examples for the GHOST workflow.', mode: 'Bundled fixtures · no mailbox access' },
]

export function createDemoState(): DemoState {
  return {
    version: 1,
    role: 'Analyst',
    activeCaseId: 'OB-2026-0003',
    connectors: { attack: false, 'domain-reputation': false, 'mail-signals': false },
    audit: [{ id: 'AUD-0001', at: now, actor: 'Analyst', action: 'DEMO_SESSION_STARTED', detail: 'Browser-local sample workspace initialized.' }],
    preferences: { reducedMotion: false, compactTables: false },
    cases: [
      {
        id: 'OB-2026-0003', title: 'Vendor invoice anomaly', purpose: 'Review a sample supplier message and its sender indicators.', leadEngine: 'GHOST', status: 'IN REVIEW', priority: 'HIGH', createdAt: now, updatedAt: now, seeded: true,
        findings: [{ id: 'F-0003', engine: 'GHOST', title: 'Sample sender mismatch', createdAt: now, priority: 'HIGH', summary: 'The fictional header fixture contains a visible sender alignment mismatch. This is a review signal, not proof of fraud.', inputLabel: 'sample-invoice-header.eml · bundled fixture', checks: [
          { id: 'C-1', title: 'From and Return-Path alignment', state: 'SIGNAL', detail: 'The displayed sender domains differ in this fixture.', source: 'Supplied sample header' },
          { id: 'C-2', title: 'Authentication results', state: 'UNKNOWN', detail: 'A pasted header is untrusted text; the result is not independently verified.', source: 'No mail provider connected' },
          { id: 'C-3', title: 'Link destination', state: 'UNAVAILABLE', detail: 'Links are never opened or fetched in this demo.', source: 'Safety boundary' },
        ] }], evidence: [], notes: ['Synthetic training case. Do not treat as a real incident.'],
      },
      {
        id: 'OB-2026-0002', title: 'Campaign asset provenance', purpose: 'Demonstrate local metadata and digest review on sample media.', leadEngine: 'MIRAGE', status: 'OPEN', priority: 'REVIEW', createdAt: now, updatedAt: now, seeded: true,
        findings: [{ id: 'F-0002', engine: 'MIRAGE', title: 'Provenance remains unknown', createdAt: now, priority: 'REVIEW', summary: 'The demo record has no verified source history. Metadata alone cannot establish authenticity.', inputLabel: 'campaign-artwork.png · fictional record', checks: [
          { id: 'C-1', title: 'Original file digest', state: 'UNKNOWN', detail: 'No source image is attached to this fictional record.', source: 'Sample data' },
          { id: 'C-2', title: 'Creator provenance', state: 'UNKNOWN', detail: 'No signed provenance or custody record was supplied.', source: 'No provenance service connected' },
        ] }], evidence: [], notes: ['Illustrative finding only.'],
      },
      {
        id: 'OB-2026-0001', title: 'Lookalike domain review', purpose: 'Review a defanged sample indicator without visiting it.', leadEngine: 'GHOST', status: 'OPEN', priority: 'REVIEW', createdAt: now, updatedAt: now, seeded: true,
        findings: [{ id: 'F-0001', engine: 'GHOST', title: 'Visual similarity needs review', createdAt: now, priority: 'REVIEW', summary: 'A fictional domain string resembles a protected brand label. No registration, DNS, or reputation data was queried.', inputLabel: 'obscura-security[.]example · bundled fixture', checks: [
          { id: 'C-1', title: 'Defanged indicator format', state: 'PASS', detail: 'The sample is displayed in defanged form.', source: 'Local format check' },
          { id: 'C-2', title: 'Brand-like terms', state: 'SIGNAL', detail: 'A security-related word appears in the supplied label.', source: 'Local lexical rule' },
          { id: 'C-3', title: 'Live reputation', state: 'UNAVAILABLE', detail: 'No reputation service is configured.', source: 'No external lookup' },
        ] }], evidence: [], notes: [],
      },
    ],
  }
}

export function loadDemoState(): DemoState {
  if (typeof window === 'undefined') return createDemoState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDemoState()
    const parsed = JSON.parse(raw) as Partial<DemoState>
    if (parsed.version !== 1 || !Array.isArray(parsed.cases) || !Array.isArray(parsed.audit)) return createDemoState()
    const fresh = createDemoState()
    return { ...fresh, ...parsed, preferences: { ...fresh.preferences, ...parsed.preferences }, connectors: { ...fresh.connectors, ...parsed.connectors } } as DemoState
  } catch {
    return createDemoState()
  }
}

export function parseDemoBackup(serialized: string): DemoState {
  if (serialized.length > 5_000_000) throw new Error('The backup file is larger than the 5 MB demo limit.')
  let value: unknown
  try { value = JSON.parse(serialized) } catch { throw new Error('This file is not valid JSON.') }
  if (!value || typeof value !== 'object') throw new Error('The file does not contain an OBSCURA demo backup.')
  const candidate = value as Partial<DemoState>
  const allowedRoles: Role[] = ['Analyst', 'Reviewer', 'Workspace admin']
  const validCheck = (item: unknown): item is CheckResult => !!item && typeof item === 'object' && typeof (item as CheckResult).id === 'string' && typeof (item as CheckResult).title === 'string' && ['PASS', 'SIGNAL', 'UNKNOWN', 'UNAVAILABLE'].includes((item as CheckResult).state) && typeof (item as CheckResult).detail === 'string' && typeof (item as CheckResult).source === 'string'
  const validFinding = (item: unknown): item is Finding => !!item && typeof item === 'object' && ['GHOST', 'MIRAGE', 'PHANTOM', 'QUANTUM'].includes((item as Finding).engine) && typeof (item as Finding).id === 'string' && typeof (item as Finding).title === 'string' && typeof (item as Finding).createdAt === 'string' && ['HIGH', 'REVIEW', 'INFO'].includes((item as Finding).priority) && typeof (item as Finding).summary === 'string' && typeof (item as Finding).inputLabel === 'string' && Array.isArray((item as Finding).checks) && (item as Finding).checks.length <= 100 && (item as Finding).checks.every(validCheck)
  const validEvidence = (item: unknown): item is EvidenceItem => !!item && typeof item === 'object' && typeof (item as EvidenceItem).id === 'string' && typeof (item as EvidenceItem).title === 'string' && typeof (item as EvidenceItem).type === 'string' && typeof (item as EvidenceItem).addedAt === 'string' && typeof (item as EvidenceItem).summary === 'string'
  const validCase = (item: unknown): item is CaseRecord => {
    if (!item || typeof item !== 'object') return false
    const entry = item as Partial<CaseRecord>
    return typeof entry.id === 'string' && entry.id.length <= 80 && typeof entry.title === 'string' && entry.title.length <= 120 && typeof entry.purpose === 'string' && entry.purpose.length <= 500 && typeof entry.leadEngine === 'string' && ['GHOST', 'MIRAGE', 'PHANTOM', 'QUANTUM', 'UNASSIGNED'].includes(entry.leadEngine) && ['OPEN', 'IN REVIEW', 'CLOSED'].includes(entry.status ?? '') && ['HIGH', 'REVIEW', 'INFO'].includes(entry.priority ?? '') && typeof entry.createdAt === 'string' && typeof entry.updatedAt === 'string' && Array.isArray(entry.findings) && entry.findings.length <= 1000 && entry.findings.every(validFinding) && Array.isArray(entry.evidence) && entry.evidence.length <= 2000 && entry.evidence.every(validEvidence) && Array.isArray(entry.notes) && entry.notes.length <= 1000 && entry.notes.every(note => typeof note === 'string' && note.length <= 5000)
  }
  const isAudit = (item: unknown): item is AuditItem => !!item && typeof item === 'object' && typeof (item as AuditItem).id === 'string' && typeof (item as AuditItem).at === 'string' && allowedRoles.includes((item as AuditItem).actor) && typeof (item as AuditItem).action === 'string' && typeof (item as AuditItem).detail === 'string'
  const knownConnectors = ['attack', 'domain-reputation', 'mail-signals']
  if (candidate.version !== 1 || !allowedRoles.includes(candidate.role as Role) || !Array.isArray(candidate.cases) || candidate.cases.length > 500 || !candidate.cases.every(validCase) || !Array.isArray(candidate.audit) || candidate.audit.length > 1000 || !candidate.audit.every(isAudit) || !candidate.connectors || typeof candidate.connectors !== 'object' || !knownConnectors.every(id => typeof (candidate.connectors as Record<string, unknown>)[id] === 'boolean') || !candidate.preferences || typeof candidate.preferences.reducedMotion !== 'boolean' || typeof candidate.preferences.compactTables !== 'boolean' || typeof candidate.activeCaseId !== 'string') {
    throw new Error('This file is not a supported OBSCURA demo backup.')
  }
  return candidate as DemoState
}

export function persistDemoState(state: DemoState) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true } catch { return false }
}

export function recordAudit(state: DemoState, action: string, detail: string): DemoState {
  const entry: AuditItem = { id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: state.role, action, detail }
  return { ...state, audit: [entry, ...state.audit].slice(0, 200) }
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function downloadText(name: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}
