import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Database, FileCheck2, FileSearch, Fingerprint, Image, Layers3, LockKeyhole, MailWarning, Plus, Radio, Search, ShieldCheck, Users, X } from 'lucide-react'
import type { FirebaseHandles } from './firebase/config'
import type { AuthUserSummary } from './firebase/auth'
import { addWorkspaceCaseNote, addWorkspaceMember, createWorkspace, createWorkspaceCase, exportWorkspaceJson, listMemberWorkspaces, listWorkspaceActivity, listWorkspaceCases, listWorkspaceMembers, recordReviewDecision, removeWorkspaceMember, restoreWorkspaceJson, saveWorkspaceFinding, updateWorkspaceCase, type WorkspaceSummary } from './firebase/repository'
import type { MemberRecord } from './firebase/schema'
import type { CaseRecord, Finding, Role } from './demo'
import { downloadText } from './demo'
import { AdvancedEngineWorkflow, EngineWorkflow } from './DemoPages'
import './styles.css'

type Screen = 'overview' | 'cases' | 'ghost' | 'mirage' | 'phantom' | 'quantum' | 'connectors' | 'members' | 'reports' | 'governance' | 'settings'
const navigation: { id: Screen; label: string; icon: typeof Layers3 }[] = [
  { id: 'overview', label: 'Overview', icon: Layers3 }, { id: 'cases', label: 'Case files', icon: FileSearch },
  { id: 'ghost', label: 'GHOST', icon: MailWarning }, { id: 'mirage', label: 'MIRAGE', icon: Image },
  { id: 'phantom', label: 'PHANTOM', icon: Fingerprint }, { id: 'quantum', label: 'QUANTUM', icon: LockKeyhole },
  { id: 'connectors', label: 'Connectors', icon: Radio },
  { id: 'members', label: 'Workspace members', icon: Users }, { id: 'reports', label: 'Reports & backup', icon: FileCheck2 },
  { id: 'governance', label: 'Data governance', icon: ShieldCheck }, { id: 'settings', label: 'Settings', icon: Database },
]

export function FirebaseConsole({ handles, user, onSignOut }: { handles: FirebaseHandles; user: AuthUserSummary; onSignOut: () => void }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const workspace = workspaces.find(item => item.id === workspaceId)
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof listWorkspaceActivity>>>([])
  const [screen, setScreen] = useState<Screen>('overview')
  const [loading, setLoading] = useState(true)
  const [membershipLoadFailed, setMembershipLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [caseTitle, setCaseTitle] = useState('')
  const [casePurpose, setCasePurpose] = useState('')
  const [caseEngine, setCaseEngine] = useState('GHOST')
  const [workspaceName, setWorkspaceName] = useState('Security Operations')
  const [workspacePurpose, setWorkspacePurpose] = useState('Defensive cybersecurity review using synthetic demonstration records.')
  const [memberUid, setMemberUid] = useState('')
  const [memberRole, setMemberRole] = useState<'analyst' | 'reviewer'>('analyst')

  const refresh = async (target = workspaceId) => {
    if (!target) return
    setBusy(true); setError('')
    try {
      const [nextCases, nextMembers, nextActivity] = await Promise.all([listWorkspaceCases(handles.db, target), listWorkspaceMembers(handles.db, target), listWorkspaceActivity(handles.db, target)])
      setCases(nextCases); setMembers(nextMembers); setActivity(nextActivity)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Workspace data could not be loaded. Check the connection and Firestore rules.')
    } finally { setBusy(false) }
  }

  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setMembershipLoadFailed(false)
    void listMemberWorkspaces(handles.db, user.uid).then(found => {
      if (!active) return
      setWorkspaces(found)
      setWorkspaceId(current => found.some(item => item.id === current) ? current : found[0]?.id ?? '')
    }).catch(cause => {
      if (active) { setMembershipLoadFailed(true); setError(cause instanceof Error ? cause.message : 'Workspace access could not be loaded. Check Firestore rules and network connectivity.') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [handles.db, user.uid])

  useEffect(() => { setCases([]); setMembers([]); setActivity([]); if (workspaceId) void refresh(workspaceId) }, [workspaceId])
  const activeCases = useMemo(() => cases.filter(item => `${item.id} ${item.title} ${item.purpose} ${item.leadEngine} ${item.status} ${item.createdAt} ${item.updatedAt} ${item.findings.map(finding => `${finding.title} ${finding.summary} ${finding.inputLabel}`).join(' ')} ${item.notes.join(' ')}`.toLowerCase().includes(search.toLowerCase())), [cases, search])
  const role: Role = workspace?.role === 'reviewer' ? 'Reviewer' : workspace?.role === 'owner' || workspace?.role === 'admin' ? 'Workspace admin' : 'Analyst'
  const canAnalyze = workspace?.role !== 'reviewer'
  const canManage = workspace?.role === 'owner' || workspace?.role === 'admin'
  const tell = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3200) }

  const submitWorkspace = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const created = await createWorkspace(handles.db, user.uid, workspaceName, workspacePurpose)
      setWorkspaces(previous => [created, ...previous]); setWorkspaceId(created.id); setScreen('overview')
      tell('Synthetic Firebase workspace created.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Workspace creation failed. Confirm that this account UID is allowlisted.') }
    finally { setBusy(false) }
  }

  const submitCase = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!workspace || !canAnalyze) return
    setBusy(true); setError('')
    try {
      const id = await createWorkspaceCase(handles.db, workspace.id, user.uid, caseTitle, casePurpose, caseEngine)
      setCaseTitle(''); setCasePurpose(''); await refresh(workspace.id); setScreen('cases'); tell(`Case ${id} saved to Firebase.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Case could not be saved. Check field limits and your workspace role.') }
    finally { setBusy(false) }
  }

  const updateCase = async (item: CaseRecord, status: CaseRecord['status']) => {
    if (!workspace) return
    setBusy(true); setError('')
    try { await updateWorkspaceCase(handles.db, workspace.id, item.id, user.uid, { status }); await refresh(workspace.id); tell(`Case status changed to ${status}.`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Case could not be updated.') }
    finally { setBusy(false) }
  }

  const saveFinding = async (caseId: string, finding: Finding) => {
    if (!workspace || !canAnalyze) return
    setBusy(true); setError('')
    try { await saveWorkspaceFinding(handles.db, workspace.id, caseId, user.uid, finding); await refresh(workspace.id) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Finding could not be saved.'); throw cause }
    finally { setBusy(false) }
  }

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!workspace || !canManage) return
    setBusy(true); setError('')
    try { await addWorkspaceMember(handles.db, workspace.id, user.uid, memberUid, memberRole); setMemberUid(''); await refresh(workspace.id); tell('Member added. The UID must already be in the project allowlist.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Member could not be added. Confirm the UID is allowlisted and has no existing membership.') }
    finally { setBusy(false) }
  }

  const removeMember = async (uid: string) => {
    if (!workspace) return
    setBusy(true); setError('')
    try { await removeWorkspaceMember(handles.db, workspace.id, user.uid, uid); await refresh(workspace.id); tell('Workspace membership removed.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Membership could not be removed.') }
    finally { setBusy(false) }
  }

  const markReviewed = async (caseId: string) => {
    if (!workspace) return
    setBusy(true); setError('')
    try { await recordReviewDecision(handles.db, workspace.id, caseId, user.uid); await refresh(workspace.id); tell('Review acknowledgment recorded in the workspace activity log.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Review acknowledgment could not be recorded.') }
    finally { setBusy(false) }
  }

  const addNote = async (caseId: string) => {
    if (!workspace || !canAnalyze) return
    const body = window.prompt('Add a short note. Use synthetic or approved public test data only.')
    if (!body?.trim()) return
    setBusy(true); setError('')
    try { await addWorkspaceCaseNote(handles.db, workspace.id, caseId, user.uid, body); await refresh(workspace.id); tell('Case note saved.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Case note could not be saved.') }
    finally { setBusy(false) }
  }

  const exportBackup = async () => {
    if (!workspace) return
    setBusy(true); setError('')
    try { downloadText(`obscura-${workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-backup.json`, await exportWorkspaceJson(handles.db, workspace), 'application/json'); tell('Versioned synthetic workspace export downloaded.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Workspace export failed.') }
    finally { setBusy(false) }
  }

  const importBackup = async (file: File) => {
    setBusy(true); setError('')
    try {
      const restored = await restoreWorkspaceJson(handles.db, user.uid, await file.text())
      const next = await listMemberWorkspaces(handles.db, user.uid)
      setWorkspaces(next); setWorkspaceId(restored.id); setScreen('overview')
      tell('Validated workspace records restored into a new Firebase workspace.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Backup could not be validated or restored.') }
    finally { setBusy(false) }
  }

  const pageTitle = navigation.find(item => item.id === screen)?.label ?? 'Overview'
  return <div className="console-shell firebase-console">
    <aside className="sidebar"><div className="side-top"><button className="brand-button" onClick={() => setScreen('overview')} aria-label="OBSCURA overview"><span className="brand-mark"><span className="brand-glyph"><Database size={19}/><i/></span><span className="brand-word">OBSCURA</span></span></button></div>
      {workspaces.length > 0 && <label className="workspace-select firebase-workspace-select"><span className="workspace-dot">{workspace?.name.slice(0, 1) ?? 'W'}</span><span className="workspace-name"><b>{workspace?.name ?? 'Choose workspace'}</b><small>Firebase · {workspace?.role ?? 'select'}</small></span><select aria-label="Choose Firebase workspace" value={workspaceId} onChange={event => setWorkspaceId(event.target.value)}>{workspaces.map(item => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select></label>}
      <div className="side-scroll">{navigation.map(item => <button key={item.id} className={`nav-item ${screen === item.id ? 'active' : ''}`} onClick={() => setScreen(item.id)}><item.icon size={16}/><span>{item.label}</span></button>)}</div>
      <div className="side-bottom"><div className="demo-chip firebase-chip"><i/> FIREBASE · SYNTHETIC DATA</div><div className="profile-row"><span className="avatar">{(user.displayName ?? user.email ?? 'U').slice(0, 2).toUpperCase()}</span><span><b>{user.displayName ?? 'Pilot user'}</b><small>{user.email ?? user.uid}</small></span></div><button className="signin-back" onClick={onSignOut}>Sign out</button></div>
    </aside>
    <main className="console-main"><header className="console-topbar"><div className="crumbs"><span className="crumb-muted">{workspace?.name ?? 'Firebase pilot'}</span><ArrowRight size={13}/><span>{pageTitle}</span></div><div className="top-actions"><span className="status-demo firebase-status"><i/> FIREBASE PILOT</span><span className="top-divider"/><span className="help-button">{workspace?.role?.toUpperCase() ?? 'NO MEMBERSHIP'}</span></div></header>
      <div className="page-wrap">
        {error && <div className="firebase-error" role="alert"><b>Action needs attention</b><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={15}/></button></div>}
        {notice && <div className="firebase-notice" role="status">{notice}</div>}
        {!loading && !membershipLoadFailed && workspaces.length > 0 && <div className="firebase-notice" role="note">Synthetic or approved public test data only. Firestore cannot verify free-text meaning; never enter real incident details, personal data, or secrets.</div>}
        {loading ? <section className="panel firebase-gate"><div className="page-eyebrow"><i/> ACCESS / FIREBASE</div><h1>Loading pilot workspace</h1><p>Checking explicit workspace membership for this signed-in account.</p></section> : membershipLoadFailed ? <section className="panel firebase-gate"><div className="page-eyebrow"><i/> ACCESS CHECK / FAILED</div><h1>Workspace access could not be loaded</h1><p>Check the Firestore rules and connection. OBSCURA will not show workspace data until membership is verified.</p><button className="button-outline" onClick={() => { setLoading(true); setMembershipLoadFailed(false); setError(''); void listMemberWorkspaces(handles.db, user.uid).then(found => { setWorkspaces(found); setWorkspaceId(current => found.some(item => item.id === current) ? current : found[0]?.id ?? '') }).catch(cause => { setMembershipLoadFailed(true); setError(cause instanceof Error ? cause.message : 'Workspace membership could not be checked.') }).finally(() => setLoading(false)) }}>Retry access check</button></section> : workspaces.length === 0 ? <section className="panel firebase-gate"><div className="page-eyebrow"><i/> FIRST WORKSPACE / SYNTHETIC ONLY</div><h1>Create your pilot workspace</h1><p>The signed-in account is allowlisted, but no workspace membership was found. Creation is checked again by Firestore rules.</p><form className="firebase-form" onSubmit={submitWorkspace}><label>Workspace name<input required maxLength={80} value={workspaceName} onChange={event => setWorkspaceName(event.target.value)}/></label><label>Defensive purpose<textarea maxLength={500} value={workspacePurpose} onChange={event => setWorkspacePurpose(event.target.value)}/></label><button className="button-primary" disabled={busy}>{busy ? 'Creating…' : 'Create synthetic workspace'} <ArrowRight size={15}/></button></form><p className="settings-explainer">If this fails, the project operator must add this UID to <code>pilotAllowlist</code> in Firestore. This setup does not require billing.</p></section> : !workspace ? <section className="panel firebase-gate"><h1>Select a workspace</h1><p>Choose a workspace where this signed-in UID has membership.</p></section> : <>
          {screen === 'overview' && <><div className="page-heading"><div><div className="page-eyebrow"><i/> FIREBASE / PHASE 6</div><h1>Workspace overview</h1><p>Only Firestore-backed workspace records are shown here. Every stored case and result is marked synthetic.</p></div><span className="status-demo firebase-status"><i/> SYNTHETIC RECORDS ONLY</span></div><div className="demo-banner"><div className="demo-banner-icon"><ShieldCheck size={15}/></div><div><b>Firestore Standard pilot</b><span>Google identity verified · membership role: {workspace.role} · no live feeds or uploaded evidence.</span></div><span className="demo-banner-ref">{workspace.id.slice(0, 8)}</span></div><div className="stats-grid"><div className="stat-card"><div className="stat-top">CASES <FileSearch size={15}/></div><div className="stat-value">{cases.length}<span className="stat-trend">bounded records</span></div></div><div className="stat-card"><div className="stat-top">FINDINGS <FileCheck2 size={15}/></div><div className="stat-value">{cases.reduce((sum, item) => sum + item.findings.length, 0)}<span className="stat-trend">saved summaries</span></div></div><div className="stat-card"><div className="stat-top">MEMBERS <Users size={15}/></div><div className="stat-value">{members.length}<span className="stat-trend">UID allowlist gated</span></div></div><div className="stat-card"><div className="stat-top">ENGINES <Radio size={15}/></div><div className="stat-value">4<span className="stat-trend">local demonstrations</span></div></div></div><div className="panel firebase-next-actions"><h2>Continue an investigation</h2><p>Create a synthetic case, then run any of the four local engines and save only a bounded result summary.</p><button className="button-primary" onClick={() => setScreen('cases')}>Open case files <ArrowRight size={14}/></button><button className="button-outline" onClick={() => setScreen('governance')}>Review data handling</button></div><div className="panel recent-panel firebase-activity-panel"><div className="panel-heading"><div><div className="panel-overline">APPEND-ONLY / AUDIT</div><h2>Workspace activity</h2></div><button className="text-small" onClick={() => void refresh()} disabled={busy}>Refresh</button></div>{activity.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>UTC TIME</th><th>ACTOR UID</th><th>ACTION</th><th>TARGET</th></tr></thead><tbody>{activity.slice(0,12).map((event,index)=><tr key={`${event.targetId}-${event.action}-${index}`}><td className="mono muted-cell">{new Date(event.createdAt).toLocaleString()}</td><td className="mono">{event.actorUid}</td><td><span className="engine-tag">{event.action}</span></td><td className="mono muted-cell">{event.targetId}</td></tr>)}</tbody></table></div> : <p className="settings-explainer">No activity records yet.</p>}</div></>}

          {screen === 'cases' && <><div className="page-heading"><div><div className="page-eyebrow"><i/> REPOSITORY / FIRESTORE</div><h1>Case files</h1><p>Create and manage bounded synthetic investigations. Case fields and transitions are enforced by Firestore rules.</p></div></div><div className="toolbar-row"><label className="search-box"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search cases…" aria-label="Search Firebase cases"/></label><button className="button-outline" onClick={() => void refresh()} disabled={busy}>Refresh</button></div>{canAnalyze && <form className="panel case-create-form" onSubmit={submitCase}><div className="panel-heading"><div><div className="panel-overline">NEW / FIRESTORE CASE</div><h2>Start an investigation</h2></div><Plus size={17}/></div><div className="form-grid"><label>Case title<input required maxLength={120} value={caseTitle} onChange={event => setCaseTitle(event.target.value)} placeholder="e.g. Synthetic sender alignment review"/></label><label>Lead engine<select value={caseEngine} onChange={event => setCaseEngine(event.target.value)}><option>GHOST</option><option>MIRAGE</option><option>PHANTOM</option><option>QUANTUM</option></select></label><label className="form-wide">Defensive purpose<textarea maxLength={500} value={casePurpose} onChange={event => setCasePurpose(event.target.value)} placeholder="Describe the approved review purpose using sample data."/></label></div><button className="button-primary compact" disabled={busy}>Create case</button></form>}<div className="firebase-case-list">{activeCases.map(item => <article className="panel firebase-case" key={item.id}><div><span className="engine-tag">{item.leadEngine}</span><h2>{item.title}</h2><p>{item.purpose || 'No purpose note.'}</p><small>{item.id} · {item.findings.length} findings · SYNTHETIC</small></div><div className="firebase-case-actions"><span className={`case-status ${item.status === 'CLOSED' ? 'contained' : item.status === 'IN REVIEW' ? 'review' : 'open'}`}><i/>{item.status}</span>{canAnalyze && <select aria-label={`Update status for ${item.title}`} value={item.status} disabled={busy} onChange={event => void updateCase(item, event.target.value as CaseRecord['status'])}><option>OPEN</option><option>IN REVIEW</option><option>CLOSED</option></select>}{canAnalyze && <button className="button-outline" onClick={() => void addNote(item.id)} disabled={busy}>Add note</button>}{workspace.role === 'reviewer' && <button className="button-outline" onClick={() => void markReviewed(item.id)} disabled={busy}>Acknowledge review</button>}</div>{item.notes.length > 0 && <details className="firebase-findings"><summary>Case notes ({item.notes.length})</summary>{item.notes.map((note,index)=><p key={index}>{note}</p>)}</details>}{item.findings.length > 0 && <details className="firebase-findings"><summary>View saved findings ({item.findings.length})</summary>{item.findings.map(finding => <div key={finding.id}><b>{finding.engine} · {finding.title}</b><p>{finding.summary}</p><small>Priority: {finding.priority} · {finding.checks.filter(check => check.state === 'SIGNAL').length} signals · confidence is not a probability</small></div>)}</details>}</article>)}{activeCases.length === 0 && <div className="panel empty-state"><FileSearch size={22}/><b>No cases found</b><span>{search ? 'Try another search.' : canAnalyze ? 'Create a synthetic case to begin.' : 'A workspace analyst can create the first case.'}</span></div>}</div></>}

          {screen === 'connectors' && <><div className="page-heading"><div><div className="page-eyebrow"><i/> DATA SOURCES / PHASE 8</div><h1>Connectors</h1><p>Source contracts and fixtures are visible. No live feed, DNS, URL, reputation, or mailbox connector is configured.</p></div></div><div className="demo-banner"><div className="demo-banner-icon"><Radio size={15}/></div><div><b>FIXTURE MODE</b><span>These sample references are synthetic and do not make network requests.</span></div><span className="demo-banner-ref">NO LIVE SOURCES</span></div><div className="connector-grid">{[{name:'MITRE ATT&CK',kind:'Knowledge base',detail:'Bundled technique taxonomy preview. Confirm attribution and version before a future update.'},{name:'Domain reputation',kind:'Threat intelligence',detail:'Synthetic sample responses only. No domain is queried or resolved.'},{name:'Email signals',kind:'Mail threat intelligence',detail:'Inert sanitized header examples. No mailbox access or link inspection.'}].map(item=><article className="panel connector-card" key={item.name}><div className="connector-top"><span className="connector-icon"><Radio size={16}/></span><span className="connector-status"><i/>FIXTURE ONLY</span></div><div className="panel-overline">{item.kind.toUpperCase()}</div><h2>{item.name}</h2><p>{item.detail}</p><button className="button-outline" onClick={() => tell(`${item.name}: bundled fixture reviewed. No external request was made.`)}>Review sample contract</button></article>)}</div><div className="panel policy-panel"><h2>Live-source approval gate</h2><p>Before enabling an external source, record terms and license, permitted use, fields, attribution, refresh limits, processing location, retention, deletion, and operator contact. Live integrations remain disabled in this build.</p></div></>}
          {(screen === 'ghost' || screen === 'mirage' || screen === 'phantom' || screen === 'quantum') && <><div className="demo-banner"><div className="demo-banner-icon"><LockKeyhole size={15}/></div><div><b>LOCAL ANALYSIS · NO NETWORK</b><span>Inputs stay on this device. Only a bounded result summary and optional digest are saved to Firestore.</span></div><span className="demo-banner-ref">SYNTHETIC ONLY</span></div>{!canAnalyze && <div className="firebase-notice">Reviewer access is read-only. Ask an analyst to run and save a check.</div>}{screen === 'phantom' || screen === 'quantum' ? <AdvancedEngineWorkflow engine={{ id: screen, name: screen.toUpperCase(), title: screen === 'phantom' ? 'Impersonation indicators' : 'Cryptographic verification', desc: screen === 'phantom' ? 'Review text-based brand and handle cues. No face or person identity matching.' : 'Explore local file hashes, ephemeral signatures, and a toy zero-knowledge protocol.', code: screen === 'phantom' ? 'SIGNALS / 12' : 'CRYPTO / 13', icon: screen === 'phantom' ? Fingerprint : LockKeyhole, color: screen === 'phantom' ? 'violet' : 'blue' }} cases={cases} role={role} onSave={(caseId, finding) => saveFinding(caseId, finding)} notify={tell}/> : <EngineWorkflow engine={{ id: screen, name: screen.toUpperCase(), title: screen === 'ghost' ? 'Threat intelligence' : 'Media forensics', desc: screen === 'ghost' ? 'Review a domain string or sanitized email header with deterministic local checks.' : 'Inspect local image signatures, bounded metadata, and a local SHA-256 digest.', code: screen === 'ghost' ? 'THREAT / 09' : 'MEDIA / 10', icon: screen === 'ghost' ? MailWarning : Image, color: screen === 'ghost' ? 'amber' : 'mint' }} cases={cases} role={role} onSave={(caseId, finding) => saveFinding(caseId, finding)} notify={tell}/>}</>}

          {screen === 'members' && <><div className="page-heading"><div><div className="page-eyebrow"><i/> ACCESS / PHASE 5</div><h1>Workspace members</h1><p>Membership is by Firebase UID. A target UID must already be approved in the project-managed pilot allowlist.</p></div></div>{canManage && <form className="panel firebase-form firebase-member-form" onSubmit={inviteMember}><label>Firebase UID<input required minLength={1} maxLength={128} value={memberUid} onChange={event => setMemberUid(event.target.value.trim())} placeholder="Paste an allowlisted UID"/></label><label>Workspace role<select value={memberRole} onChange={event => setMemberRole(event.target.value as 'analyst' | 'reviewer')}><option value="analyst">Analyst</option><option value="reviewer">Reviewer</option></select></label><button className="button-primary" disabled={busy}>Add member</button></form>}<div className="panel full-table-panel"><div className="table-scroll"><table className="data-table"><thead><tr><th>FIREBASE UID</th><th>ROLE</th><th>STATUS</th><th/></tr></thead><tbody>{members.map(member => <tr key={member.uid}><td className="mono">{member.uid}</td><td>{member.role}</td><td><span className="case-status open"><i/>ACTIVE</span></td><td>{canManage && member.uid !== workspace.ownerUid && member.uid !== user.uid && <button className="text-small" onClick={() => void removeMember(member.uid)} disabled={busy}>Remove</button>}</td></tr>)}</tbody></table></div></div></>}

          {screen === 'reports' && <><div className="page-heading"><div><div className="page-eyebrow"><i/> REPORTING / PHASE 6</div><h1>Reports &amp; backups</h1><p>Download a versioned JSON copy of bounded workspace metadata and findings. This is a convenience export, not managed backup.</p></div></div><div className="panel firebase-next-actions"><h2>Workspace export</h2><p>Original image bytes, raw message contents, passwords, tokens, and full email addresses are not included.</p><button className="button-primary" onClick={() => void exportBackup()} disabled={busy}>Download JSON backup <ArrowRight size={14}/></button><button className="button-outline" onClick={() => void refresh()} disabled={busy}>Refresh workspace data</button></div><div className="panel firebase-next-actions"><h2>Restore as a separate workspace</h2><p>Choose a schema-validated OBSCURA export. Restored cases are assigned to your UID, membership roles from the file are ignored, and original evidence bytes cannot be restored.</p><label className="button-outline restore-backup">Choose JSON backup<input type="file" accept="application/json,.json" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.currentTarget.value = '' }}/></label></div><div className="panel policy-panel"><h2>Recovery boundary</h2><p>Restore creates new Firestore records one by one and can be interrupted by connection or quota errors. This feature is a convenience restore rehearsal, not a managed backup or atomic disaster-recovery system.</p></div></>}

          {screen === 'governance' && <><div className="page-heading"><div><div className="page-eyebrow"><i/> PRIVACY / PHASE 7</div><h1>Data governance</h1><p>Current pilot permissions and storage boundaries.</p></div></div><div className="panel governance-panel"><h2>Synthetic-only pilot</h2><ul><li>Only synthetic or public test inputs approved for demonstration are permitted.</li><li>GHOST analyzes supplied text in the browser. Suspicious links are never opened or fetched.</li><li>MIRAGE reads selected images locally; original bytes are never uploaded to Firebase.</li><li>PHANTOM reviews text cues only; it does not identify people or analyze faces.</li><li>QUANTUM demonstrations are local and educational; the toy proof is not production cryptography.</li><li>Firestore stores case metadata, per-check summaries and optional SHA-256 digests only.</li><li>Real evidence is disabled until retention, deletion, jurisdiction, access review and incident-response policies are approved.</li><li>External threat feeds and AI services are not connected.</li></ul></div><div className="panel policy-panel"><h2>Retention and deletion</h2><p>Firestore project operators must set and review retention before real evidence is considered. Removing a membership blocks future access but does not delete prior records. Case records containing findings are retained because Firestore does not cascade subcollections.</p></div></>}

          {screen === 'settings' && <><div className="page-heading"><div><div className="page-eyebrow"><i/> SYSTEM / ACCOUNT</div><h1>Settings</h1><p>Signed-in identity, workspace access and safe session actions.</p></div></div><div className="panel firebase-next-actions"><h2>{user.displayName ?? 'Firebase account'}</h2><p>{user.email ?? user.uid}</p><p>Workspace role: <b>{workspace.role}</b> · User ID: <code>{user.uid}</code></p><button className="button-outline" onClick={onSignOut}>Sign out of OBSCURA</button></div></>}
        </>}
      </div>
      <footer className="console-footer"><span>OBSCURA <i>/</i> FIREBASE PILOT</span><span>SYNTHETIC ONLY · NO LIVE FEEDS · NO ORIGINAL EVIDENCE STORAGE</span></footer>
    </main>
    <div className="firebase-console-nav" role="navigation" aria-label="Firebase workspace navigation">{navigation.map(item => <button key={item.id} aria-current={screen === item.id ? 'page' : undefined} onClick={() => setScreen(item.id)}><item.icon size={16}/><span>{item.label}</span></button>)}</div>
  </div>
}
