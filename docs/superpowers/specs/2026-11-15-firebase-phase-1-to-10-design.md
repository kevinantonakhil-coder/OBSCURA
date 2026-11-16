# OBSCURA Phases 1–10 — Firebase-Backed Product Design

**Status:** Proposed for approval  
**Date:** 2026-11-15

## Intent

Turn the current Phase 1–10 browser demo into a usable, authenticated OBSCURA investigation workspace for a small invited pilot. The public landing page remains available; the console gains real Firebase identity, workspace membership enforcement, and persistent case records. All four engines run bounded local demonstrations in the browser: GHOST, MIRAGE, text-only PHANTOM, and educational QUANTUM. The product must explain when a result is synthetic, local, unavailable, or unverified.

This design follows the user's choice to proceed with Firebase. The existing Phase 3 FastAPI/PostgreSQL proposal must be updated to match this choice before implementation; it is not the selected architecture.

## Goals

- Preserve the public landing page and responsive Intelligence Console.
- Replace demo role selection with real Firebase Authentication when configuration is present; keep a clearly labeled, isolated local-demo path when it is not.
- Enforce workspace and role authorization in Firestore Security Rules, independently of sign-in.
- Store workspace-scoped cases, indicators, findings, notes, membership metadata, and audit summaries in Firestore.
- Retain local GHOST/MIRAGE checks and PHANTOM/QUANTUM educational workflows, traceable per-check results, case review, and report/backup export.
- Add a workspace membership management flow and test allowed and denied operations.
- Keep the product usable without paid services, secrets in the browser, AI APIs, or external network analysis.
- Make the data governance, provenance, uncertainty, retention, deletion, and recovery boundaries visible in the product.

## Non-goals and release gates

- No automatic blocking, takedowns, arbitrary URL requests, attachment execution, face/biometric identification, or AI verdicts.
- No Cloud Functions, Cloud Storage uploads, private evidence archive, or external threat-feed integration in this milestone.
- Do not accept real incident evidence until Phase 2 data handling and retention decisions are approved. The first Firebase-connected experience is limited to synthetic/sample data and non-sensitive workspace metadata.
- Do not claim a managed backup service or completed production restore drill. Provide user-controlled JSON export/import and a documented emulator restore rehearsal; production recovery remains gated.
- Do not deploy Firebase resources, create a Firebase project, link billing, alter GitHub settings, or publish the website as part of implementation.
- Do not use paid services or incur API charges. Firebase Cloud Storage currently requires the Blaze pay-as-you-go plan; Cloud Functions also requires Blaze. Both are excluded unless the user later opts in.

## Approaches considered

1. **Keep a complete browser-local simulation.** No cloud setup or service cost; multi-user identity, authorization, and persistence would still be simulated. This does not satisfy the request for a real Firebase-backed product.
2. **Firebase Authentication + Cloud Firestore Standard + Security Rules (selected).** Keeps the existing React app, uses real sign-in, persists workspace records, and makes Firestore Rules the server-enforced authorization boundary. It can be developed with Firebase emulators and avoids Cloud Functions and Storage's billing requirement. Trade-off: member onboarding uses user IDs, background jobs and managed file storage are deferred, and retention/recovery need explicit user policy.
3. **Firebase plus Cloud Functions and Cloud Storage.** Supports server-managed invitations, privileged workflows, and private file storage. It requires a Blaze billing account and therefore conflicts with the existing no-paid-cost constraint; it is not selected now.

## Architecture and data boundaries

- **Frontend and public hosting:** existing React, TypeScript, and Vite project remains on GitHub Pages. Firebase web configuration is public app configuration, not an Admin SDK secret; no privileged credentials or API secrets enter the client bundle. Build-time `VITE_` values are exposed publicly and must contain only Firebase's web-app configuration.
- **Identity:** Firebase Authentication with Google sign-in and verified email. Console access requires a signed-in identity plus an authorized workspace membership. No anonymous sign-in.
- **Authorization:** Firestore Security Rules deny by default and validate pilot allowlist status, workspace membership, role, schema, size, immutable fields, and permitted state changes on each operation. A signed-in account without an operator-approved pilot UID and workspace membership has no case access. An allowlisted workspace creator is the initial owner; owner/admin can add only already-allowlisted members by Firebase UID with Analyst or Reviewer role. The project operator controls the pilot UID allowlist; workspace users cannot add themselves to it. Role and membership fields are not client-editable by ordinary members.
- **Storage:** Firestore Standard edition for small structured records only. No original evidence bytes or secrets. MIRAGE reads permitted synthetic test images in-browser, computes a SHA-256 digest locally, and saves a summary/digest only. File upload stays disabled.
- **Connectors:** connector framework and synthetic fixtures only. The product must show source terms, attribution, freshness, processing destination, and governance state. Any live source stays disabled until its terms, fields, purpose, attribution, rate limits, retention, and deletion policy are approved.
- **Persistence fallback:** when Firebase configuration is absent, the existing browser-local demo remains available and is clearly labeled. Local and Firebase workspaces are separate; no implicit migration or upload of browser data. Firebase-backed records must remain synthetic/demo-only until data handling and retention policy approval.
- **Backup:** export/import JSON is user-triggered, versioned, schema-validated, and documented as a convenience backup. Test restoration with the Firebase Emulator Suite; do not represent this as managed cloud backup.

### Firestore model (initial)

- `workspaces/{workspaceId}`: title, purpose, owner UID, status, created/updated timestamps, schema version.
- `workspaces/{workspaceId}/members/{uid}`: UID, role (`owner`, `admin`, `analyst`, `reviewer`), membership timestamps, inviter UID; no email or other PII.
- `workspaces/{workspaceId}/cases/{caseId}`: case title/purpose/status, owner UID, timestamps, and bounded synthetic/operational metadata.
- `workspaces/{workspaceId}/cases/{caseId}/findings/{findingId}`: engine/rule version, per-check status, bounded observations, input reference/digest, result time, limitations, and review state.
- `workspaces/{workspaceId}/cases/{caseId}/activity/{eventId}`: append-style metadata events with actor UID, action, target ID, and timestamp; never evidence bodies or secrets.

The detailed schema, indexes, and rules are finalized during implementation after checking that a Standard Firestore database is available. If the project already has an instance, it will not be changed without selecting it explicitly.

## Phase coverage in this milestone

| Phase | Planned deliverable |
|---|---|
| 1 | Refined responsive public landing and authenticated console; no publish from this task. |
| 2 | Requirements and safety document updated to reflect Firebase route; approval and live-data gates remain explicit. |
| 3 | Architecture/threat model updated from FastAPI/PostgreSQL proposal to Firebase Auth/Firestore; trust boundaries and limitations documented. |
| 4 | Firebase Google sign-in, sign-out, session state, pilot allowlist gating, and unavailable/unconfigured states. |
| 5 | Workspace membership and roles enforced by Firestore Rules; role UI reflects server-read permissions, not client-selected values. Pilot allowlist is operator-managed. |
| 6 | Firestore-backed synthetic workspace/case workflow, audit metadata, versioned JSON export/import, emulator backup/restore rehearsal. No managed backup claims. |
| 7 | Governance and evidence handling screens, source inventory fields, synthetic-only data guard, retention/deletion choices documented. Real evidence stays disabled until user policy approval. |
| 8 | Connector contracts, consent/status UI, and synthetic fixture execution; live connectors disabled pending source approval. |
| 9 | GHOST deterministic domain and sanitized-header checks, per-check explanations, uncertainty, and save-to-case. |
| 10 | MIRAGE safe local image-header/metadata and SHA-256 checks, strict size/type limits, provenance notes, and save-to-case; no upload or authenticity verdict. |

## Accessibility, safety, and failure behavior

- Visible keyboard focus, labels, responsive layouts, reduced-motion behavior, and clear sign-in/error/loading states.
- Authentication failure, missing configuration, permission denial, quota exhaustion, and offline mode must show explicit states; no failed lookup appears as a clean result.
- Store only bounded input and output fields. Defang URLs in display, never navigate to or fetch submitted indicators.
- Preserve individual `pass`, `signal`, `unknown`, `unavailable`, and `error` states. Any priority is explicitly a review ranking, not a probability.
- Keep sensitive fields out of analytics and logs; do not store secrets or full evidence contents.

## Verification expectations

- TypeScript production build succeeds.
- Firebase Emulator Suite tests cover anonymous access denial; signed-in non-member denial; allowed case access by member; reviewer write restrictions; analyst case workflow; admin member management; ownership/role escalation attempts; malformed/oversized records; immutable fields; and cross-workspace reads/writes.
- Browser walkthrough covers unconfigured local demo, Firebase sign-in states, workspace creation, adding a member, case create/update/search, GHOST/MIRAGE/PHANTOM/QUANTUM save, report/backup export/import, mobile layout, and keyboard/reduced-motion behavior.
- Rule syntax is validated locally. No Firebase project or remote service is provisioned during verification.

## User-owned setup after implementation

The user must create/select a Firebase project, register the web app, enable Google sign-in, add the GitHub Pages origin to authorized domains, create/select a Standard Firestore database and region, and provide the public web-app configuration through the documented local/GitHub build settings. The first pilot user UID must be explicitly allowlisted by the project operator; later pilot identities must also be allowlisted before workspace membership can be granted. This design does not authorize enabling billing. Before real case data, the user must also approve the workspace model, retention/deletion policy, hosting/data region, and any source-specific governance record.

## Builder decisions

- Use Google sign-in only in the first Firebase-backed milestone; adding email/password can be considered later if onboarding needs it.
- Preserve the current browser-local demo as a fallback and do not copy its state into Firebase automatically.
- Use explicit workspace membership by UID for collaboration, avoiding email addresses in Firestore membership documents.
- Keep Firebase Storage and Cloud Functions out until the user explicitly approves the billing implications and policy decisions.
