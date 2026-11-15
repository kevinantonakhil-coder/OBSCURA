# OBSCURA — 20-Phase Product Roadmap

**Status:** Working roadmap · **Last updated:** 2026-11-14

Each phase should produce a reviewable milestone. A phase does not mean live analysis exists until its backend, data source, security controls, and evaluation have been implemented and approved for use.

## Current progress

- **Phase 1:** The published GitHub Pages site is still the earlier static preview. The local source now contains an expanded browser-local demo through Phase 10; these latest changes have not been published.
- **Phase 2:** Product and safety requirements are a complete working draft, pending user review and approval.
- **Phase 3:** The architecture and threat model remain a proposal and have not been approved as the implementation design.
- **Phase 4:** Firebase Authentication is the selected direction, but no Firebase project or authentication flow is connected. The current sign-in screen only switches local demo roles.
- **Phases 5–8:** The site demonstrates role-based interface states, browser-local case persistence, governance guidance, and bundled connector fixtures. It does not implement server authorization, a backend, governed live intake, or external connectors.
- **Phases 9–10:** GHOST text checks and MIRAGE PNG/JPEG header and SHA-256 checks run locally in the browser. These are deterministic demonstrations, not live threat intelligence or authenticity verdicts.
- **Phase 5 gate:** Authorization remains separate from sign-in. A Firebase-authenticated identity must not receive case or workspace access until server-side authorization is designed and enforced.

| Phase | Work | Milestone |
|---|---|---|
| 1. Frontend preview | React/Vite landing page, Intelligence Console, and demo workflows through Phase 10 | Published frontend plus expanded local source demo; no backend or live analysis |
| 2. Product and safety requirements | Define users, roles, workflows, data classes, retention needs, engine boundaries, and abuse controls | Complete working draft; pending review: [Product and safety requirements](../product/phase-2-product-and-safety-requirements.md) |
| 3. System architecture and threat model | Select trust boundaries, data flows, isolation controls, threats, and pre-production gates | [Architecture and threat model](../architecture/phase-3-system-architecture-and-threat-model.md) |
| 4. Authentication | Integrate Firebase Authentication; choose sign-in method and define MFA, session, account recovery, account disablement, and authorized domains | Firebase-backed sign-in and account lifecycle work; no case access is granted by authentication alone |
| 5. Authorization | Define and enforce workspace membership, roles, object ownership, and deny-by-default resource access | Independently checked permissions, with tests for allowed and denied access |
| 6. Backend, cases, and recovery foundation | API, PostgreSQL schema, migrations, case lifecycle, audit events, backups, and a restore rehearsal using disposable data | A small persistent case service with a demonstrated recovery path |
| 7. Data governance and evidence policy | Approve data inventory, source permissions/licenses, labels, provenance, privacy, retention, deletion, and allowed evidence types | Signed-off rules before external data collection or evidence ingestion |
| 8. Controlled connectors | Build connector contracts only for Phase 7-approved sources; add attribution, terms, normalization, deduplication, freshness, and rate limits | Safe, attributed ingestion from approved sources |
| 9. GHOST | Defensive domain and sanitized email-header checks with deterministic rules and approved sources | Demo: local text rules with explicit unknown/unavailable states; live source connectors remain future work |
| 10. MIRAGE | Supported metadata, hashes, provenance checks, and documented uncertainty | Demo: local PNG/JPEG header and SHA-256 checks; no authenticity verdict or server-side evidence service |
| 11. Early usable MVP | Connect GHOST and MIRAGE to authorized, representative test inputs; save per-check results, provenance, and analyst review into cases | Small analyst workflow usable before later engines and scale work |
| 12. PHANTOM | Brand, domain, handle, and text-pattern comparisons | Impersonation signals without face or biometric identification |
| 13. QUANTUM and unified reporting | Deterministic hash/signature verification, educational ZK examples, cross-engine timelines, and reports | Unified investigation view with deterministic crypto results |
| 14. Evaluation baseline | Build time-separated and source-separated test sets; measure precision, recall, misses, false positives, review burden, and coverage | Reproducible quality report and release gates |
| 15. Confidence and decision quality | Define per-check evidence, source age, conflicts, unknowns, limitations, and calibrated confidence semantics | Reviewers can see why a signal exists and what remains unverified |
| 16. Optional ML pilot | Only if a specific task shows a gap: compare a task-specific model against rule-based baselines | Model assist only when measured results improve; otherwise keep the no-model path |
| 17. Multi-million-record scale | Scale only permitted, useful indicator records with partitioning, deduplication, retention, and poisoning controls | Capacity demonstrated at measured load without weakening source controls |
| 18. Operations and monitoring | Service health, feed freshness, queue controls, drift alerts if models exist, incident runbooks, and cost limits | Observable and recoverable service operations |
| 19. Security and recovery readiness | Independent application/security review, dependency/CI controls, access review, recurring backup restores, and incident exercises | Readiness evidence before a broader beta |
| 20. Controlled beta and improvement | Limited onboarding, support, feedback, usage measurement, and release review | Evaluated beta with a maintained improvement backlog |

## Machine-learning guardrails

- Define one task and decision boundary per model. A model may prioritize review; it does not make accusations or take external actions.
- Measure precision, recall, false-positive burden, calibration, time-based generalization, and performance across relevant sources and case types. Do not rely on aggregate accuracy alone.
- Treat volume as a capacity goal, not a quality signal. Millions of rows require deduplication, timestamps, source/label provenance, rights review, retention rules, and poisoning controls.
- Keep machine learning optional. Rule-based GHOST and MIRAGE workflows must remain useful without an AI API; compare any proposed model with those baselines and retain human review, abstention, monitoring, and rollback.
- Keep customer evidence out of shared model training by default. Any change requires a documented purpose, permission, and privacy review.
- Do not use face recognition or biometric identification in PHANTOM. Keep QUANTUM verification deterministic.

## Suggested work order

- **Foundation — Phases 1–7:** define the product, architecture, identity, access control, persistence, data governance, and evidence policy.
- **Core intelligence — Phases 8–13:** approved connectors and the four engines, with an early GHOST/MIRAGE case-based MVP at Phase 11.
- **Prove it works — Phases 14–16:** test quality, define confidence semantics, and add ML only if comparative evaluation justifies it.
- **Scale and release — Phases 17–20:** scale measured workloads, operate safely, rehearse recovery, and run a controlled beta.
