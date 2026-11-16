# OBSCURA Phase 2 — Product and Safety Requirements

**Status:** Approved baseline for the synthetic Firebase pilot; real-data policy remains pending · **Date:** 2026-11-15
**Scope:** Define the first usable defensive investigation product before connecting analysis services.

## 1. Product intent

OBSCURA helps security analysts collect, preserve, compare, and explain digital threat indicators in one investigation workspace. It presents traceable evidence and specialist signals so a human reviewer can make the decision. It does not claim that a single signal proves malicious intent or media fabrication.

The repository now contains an optional Firebase-backed synthetic pilot implementation. No Firebase project is connected, the GitHub Pages build has not been updated, and no cloud service or live analysis has been provisioned. Firebase authentication and Firestore workflows become active only after owner-controlled project setup and rules deployment. The browser-local demo remains isolated and does not migrate its data.

## 2. Users and responsibilities

| Role | Primary responsibilities | Initial permissions |
|---|---|---|
| Analyst | Create cases, add indicators, review evidence and findings, write notes, draft reports | Read and update assigned workspace cases; submit permitted analysis jobs |
| Reviewer | Check evidence provenance, findings, and reports; record review decisions | Read workspace cases; add review decisions; cannot alter original evidence |
| Workspace administrator | Invite users, assign roles, configure retention and approved connectors | Manage workspace membership and policy; access to evidence is separately auditable |
| Platform operator | Maintain the service and respond to incidents | Infrastructure access is separate from analyst access, time-limited where practical, and audited |

These roles are proposed defaults. An organization may need a different separation of duties before deployment.

### Authentication and authorization are separate controls

- **Authentication** establishes which account is making the request (for example, through an OIDC sign-in and MFA policy).
- **Authorization** independently decides whether that account may perform this action on this workspace, case, evidence item, or report.
- A valid sign-in never grants access by itself. Every API operation checks current account status, workspace membership, role, resource ownership, and requested operation.
- Phase 4 implements identity and sessions. Phase 5 implements permissions and negative access tests. Both gates must pass before any multi-user case data is accepted.

## 3. Core workflow

1. An analyst opens or creates a case and records a question or defensive purpose.
2. The analyst adds a defanged indicator, a permitted public reference, or an evidence item through an approved path.
3. OBSCURA records the source, collection time, submitter, handling history, and applicable data policy.
4. The analyst chooses an engine and sees what data that engine will process and whether any approved external provider is involved.
5. The engine produces signals with provenance, limits, and an explicit result state such as `complete`, `partial`, `unavailable`, or `needs review`.
6. The analyst compares signals, records a decision, and drafts a report from traceable case material.

No engine finding automatically blocks a domain, quarantines an account, identifies a person, or takes another external action.

## 4. Engine boundaries

### MIRAGE — Media forensics

- Inspect supported metadata, hashes, and documented provenance or transformation signals.
- Preserve the original file and distinguish original evidence from derived previews or extracts.
- Report which checks ran, which did not, and how a signal could be explained by ordinary processing.
- Do not present a model score as proof that media is authentic or fabricated.

### GHOST — Defensive threat intelligence

- Review defanged URLs, domains, message text, and supplied email headers.
- Use only named, approved reputation or intelligence providers through server-side connectors.
- Never navigate to user-supplied suspicious URLs, fetch arbitrary page content, execute attachments, or resolve arbitrary user-controlled destinations from a worker.

### PHANTOM — Impersonation signals

- Compare public brand names, domains, handles, and text or visual-brand context that the submitter is authorized to review.
- Show the matching features and source references so an analyst can validate context.
- Prohibit face recognition, biometric identification, and claims that a signal establishes a real person's identity.

### QUANTUM — Cryptographic verification

- Use deterministic standard-library or reviewed-library methods for file hashes and supported digital signatures.
- Separate actual verification results from educational zero-knowledge demonstrations.
- State the exact input, algorithm, key or certificate context, and validation limits.
- Do not label ordinary cryptography “quantum secure” unless a specifically reviewed post-quantum algorithm is being used.

## 5. Product requirements

Priority: **M0** means required before real case data is accepted; **M1** means required before a wider beta; **M2** means a later enhancement.

| ID | Priority | Requirement |
|---|---|---|
| PR-01 | M0 | Every case, evidence item, job, finding, and report belongs to a workspace and has an authorization check on every read and write. |
| PR-02 | M0 | Cases support title, purpose, status, owner, timestamps, linked indicators, evidence, notes, and a reviewable activity history. |
| PR-03 | M0 | Evidence records preserve source, collection time, submitter, original hash, custody events, and derived-item relationships. |
| PR-04 | M0 | Findings identify engine/version, input references, checks performed, timestamps, confidence or uncertainty where applicable, and limitations. |
| PR-05 | M0 | A failed, timed-out, or unavailable provider never appears as a clean result; the UI displays an explicit non-success state. |
| PR-06 | M0 | The user can see the processing destination, data categories, retention, and external-provider status before submitting data. |
| PR-07 | M0 | A reviewer can preserve a finding, mark it disputed or accepted, and add reasoning without overwriting source evidence. |
| PR-08 | M0 | Reports include provenance and a demo/live status; draft reports are clearly distinguished from verified conclusions. |
| PR-09 | M0 | Search supports case, indicator, evidence ID, engine, status, and date filters within authorized workspaces. |
| PR-10 | M1 | Users can export an auditable report with evidence references and a clear statement of the analysis limitations. |
| PR-11 | M1 | Administrators can manage workspace membership, roles, approved connectors, and retention settings. |
| PR-12 | M1 | The service supports accessible keyboard workflows, visible focus, reduced motion, and responsive layouts. |
| PR-13 | M2 | Analysts can view an investigation graph and timeline derived only from evidence and findings already associated with their case. |
| PR-14 | M0 | Authentication and authorization have distinct interfaces and controls; authenticated users receive no workspace or case access until separate authorization succeeds. |
| PR-15 | M0 | Authorization is tested for both allowed and denied access, including cross-workspace case IDs, evidence IDs, reports, exports, and background jobs. |
| PR-16 | M0 | Findings expose a check-by-check record: result state, input/evidence reference, supporting observation, source and timestamp, limitation, and any unverified or conflicting signal. |
| PR-17 | M0 | A risk-priority score is labeled as a ranking or score, not a probability. A probability claim requires a defined target event, calibration evidence, and evaluation on held-out time-separated data. |
| PR-18 | M0 | Core rule-based GHOST and MIRAGE checks run without an AI API. Model-assisted results are optional and cannot suppress or replace deterministic checks. |
| PR-19 | M0 | After GHOST and MIRAGE are built, an early MVP connects them to authorized representative test inputs, saves per-check outputs and provenance to cases, and supports analyst review. |
| PR-20 | M0 | Before any external source is collected, the source is inventoried and its permissions/terms, fields, purpose, refresh, attribution, privacy, retention, and deletion behavior are approved. |
| PR-21 | M0 | Before production case data is accepted, a backup is restored into an isolated test environment and checked for completeness, access isolation, and deletion/retention behavior. |

## 6. Data handling and privacy requirements

- Collect only data needed for a stated defensive purpose.
- Classify data at intake: public indicator, operational case metadata, confidential evidence, or secret/credential. Secrets and credentials are not accepted as case evidence.
- Keep uploaded evidence private, encrypted in transit and at rest, and segregated by workspace authorization.
- Apply a documented retention period and deletion workflow before production evidence storage opens. Legal holds and backup expiration need a documented policy.
- Keep evidence out of product analytics, error traces, and ordinary application logs. Log identifiers and handling events instead of raw content where practical.
- Do not send private case material to a model or external provider unless the workspace policy names the provider, the processing purpose, and the permitted fields, and the analyst receives clear notice.
- Do not use customer evidence or case notes to train shared models by default. Any later opt-in must be explicit, revocable where feasible, and separated from service access.
- Do not deploy the product into a jurisdiction or sector until its data location, retention, contractual, and regulatory requirements have been reviewed.
- Complete source-by-source governance before Phase 8 connector ingestion. A public feed is not automatically permission to store, redistribute, or use its records as training labels.
- For every source, record its owner, acquisition method, terms, license, permitted purposes, attribution, rate limits, data fields, update cadence, retention, and contact/removal process.

## 7. Safety and abuse requirements

- Treat indicators, uploaded documents, extracted text, and provider results as untrusted input.
- Store URLs in defanged form for display and never make browser navigation the analysis mechanism.
- Use provider allowlists; block arbitrary network egress from parsing and analysis workers.
- Keep attachment processing in a constrained worker, with resource caps and no execution of embedded content.
- Make external lookups opt-in per connector and visible in the audit history.
- Require human confirmation before any future feature takes an external action. No automatic blocking, takedown, account action, or notification is in scope for the first usable release.
- Prohibit face-based identification and biometric matching in PHANTOM's requirements and future model evaluation.
- Add rate limits, abuse reporting, and workspace suspension procedures before public self-service sign-up.

## 8. Success measures

Phase 2 defines how later phases will be evaluated; it does not set unsupported detection targets.

- Analysts can trace every displayed finding to an input, source, engine version, and timestamp.
- Cross-workspace access tests show no case or evidence disclosure.
- Analysts can distinguish a live check, a simulated result, a partial result, and a failed result.
- Engine evaluation measures false positives, missed detections, calibration, and review time on time-separated data.
- Reports preserve uncertainty and evidence references; user research confirms that reviewers understand what a score does and does not mean.

## 9. Confidence and risk-score semantics

- A **check result** states what a specific rule or verification step observed. It includes `pass`, `signal`, `unknown`, `unavailable`, or `error` rather than collapsing every state into a numeric score.
- A **risk-priority score** ranks cases or indicators for review according to documented rules. It is not a probability that the item is malicious.
- A **confidence estimate** describes support for a defined claim. It may be presented as a probability only after the claim, target population, calibration method, and validation results are documented.
- Show which checks contributed, their evidence references, source timestamps/freshness, source trust policy, conflicts, and checks that could not be run.
- Preserve negative and inconclusive results. Missing data must not be silently treated as a clean result.
- If a future model produces a number, show its model/rule version, validation scope, calibration status, known limitations, and abstention behavior.

## 10. Early GHOST/MIRAGE MVP

The first genuinely usable milestone follows GHOST and MIRAGE rather than waiting for the full product. It should:

- Run deterministic GHOST rules on approved, inert test records such as defanged domains, sanitized headers, and documented message examples.
- Run MIRAGE checks on permitted media fixtures with known provenance/metadata and documented expected observations.
- Save results to a case with input digest/reference, per-check status, rule/engine version, timestamp, source, and analyst decision.
- Include negative, stale, conflicting, malformed, and unavailable-input examples so the workflow demonstrates uncertainty and failures.
- Avoid sending fixtures or case material to third-party AI services. The MVP should work without model credentials or a live model API.

Dataset licenses and use terms must be reviewed before incorporating any external fixtures. MITRE ATT&CK is a structured defensive knowledge source with STIX/TAXII distribution; URLhaus requires vendors to review its Terms of Service before product use. See [MITRE ATT&CK data and tools](https://attack.mitre.org/resources/attack-data-and-tools/) and [URLhaus About and terms notice](https://urlhaus.abuse.ch/about/).

## 11. Decisions needed before accepting real evidence

The following defaults make the product scope concrete while keeping higher-risk choices behind explicit gates. They are requirements recommendations, not claims that a service or provider has been selected.

| Decision | Recommended Phase 2 default | Gate before live capability |
|---|---|---|
| Initial customer | A small, invited pilot for one organization; design records with workspace boundaries so later multi-tenant use does not rely on UI-only separation. | Decide whether the first release is single-organization or multi-tenant before backend authorization and storage design. No public self-service sign-up in the first release. |
| Hosting and data location | No provider or region selected yet. Keep the product demo-only and prohibit real evidence until location, residency, backup location, and operator access are reviewed. | Approve hosting, data region, backup region, contractual terms, and operational owners before creating live accounts or storing case data. |
| Retention and deletion | Do not accept real case evidence while retention periods are undefined. The policy must cover cases, originals, derived artifacts, logs, exports, and backup expiry. | Set time periods, legal-hold handling, deletion behavior, and verification before enabling evidence storage. |
| Initial evidence types | Accept only explicitly supported, inert formats after file limits and parser isolation are specified. Exclude executables, scripts, archives, password-protected files, and malware samples from the initial release. Treat URLs as defanged text; never visit them. | Approve format allowlist, size limits, parser limits, quarantine, deletion, and restore behavior before uploads are enabled. |
| External intelligence | No external reputation/feed connector in the first usable release unless a specific source passes terms, license, purpose, attribution, rate-limit, privacy, and retention review. | Approve each source independently before collection; public availability alone is not permission to redistribute or train on data. |
| External AI/model services | No external model provider for the first usable release. Keep rule-based GHOST and MIRAGE useful without AI. | Any later model needs a named task, permitted fields, provider terms, user notice, evaluation, and an opt-in decision before private data is sent. |
| Identity and permissions | Keep authentication and authorization separate. Require MFA for privileged roles as a target policy; do not grant case access merely because a user signs in. Provider and exact MFA policy remain for Phase 4; role enforcement is Phase 5. | Approve identity provider, recovery, MFA, account disablement, role matrix, and both allowed/denied access tests before multi-user case access. |
| Support and incident response | Invited pilot only, with a named operational contact and documented process for account removal, suspected exposure, provider incidents, and user reports. Do not promise a response time until staffed. | Define contact channel, ownership, escalation, notification obligations, and account-removal behavior before beta. |

### Phase 2 scope baseline

- **In scope:** a defensive investigation workspace that organizes supplied indicators and permitted evidence, records per-check findings with provenance, and supports human review and report drafting.
- **Out of scope:** automatic blocking or takedowns; arbitrary browsing of suspicious URLs; attachment execution; face or biometric identification; a claim that a score proves maliciousness; collection or training on customer evidence by default; and live data ingestion before governance approval.
- **First useful milestone:** rule-based GHOST and MIRAGE plus text-only PHANTOM and educational QUANTUM checks on synthetic inputs, saved as bounded results in a case. External source lookups remain disabled.
- **Data gate:** until hosting, retention, evidence policy, access control and recovery are approved and implemented, use synthetic/demo data only. Do not accept real user evidence or credentials.

## 12. Phase 2 completion criteria

- Product intent, initial users, roles, core workflow, engine boundaries, exclusions, and data classes are defined in this document.
- Authentication and authorization are distinct; access cannot be inferred from sign-in, and both allowed and denied access checks are required before multi-user case data.
- MVP inputs, source approval gates, data handling, retention, deletion, incident handling, and recovery dependencies are documented.
- Finding states, score/confidence wording, provenance, conflict, and uncertainty requirements are defined.
- Each decision that is not yet safe to finalize has a recommended default and an explicit no-live-data gate.
- **Approval state:** this requirements baseline is approved for the Firebase synthetic pilot. This does not approve real case data, live connectors, paid APIs, Storage, Cloud Functions, or public deployment of Firebase configuration.

## References

- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework) — outcomes spanning Govern, Identify, Protect, Detect, Respond, and Recover.
- [OWASP Application Security Verification Standard 5.0](https://asvs.owasp.org/) — proposed secure application verification baseline.
- [NIST AI Risk Management Framework](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) — Govern, Map, Measure, and Manage across the AI lifecycle.
