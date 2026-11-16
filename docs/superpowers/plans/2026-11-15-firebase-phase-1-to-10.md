# OBSCURA Firebase Phases 1–10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing browser-local OBSCURA preview into a Firebase Authentication and Firestore-backed, invite-only synthetic-data workspace while preserving the local demo path and all four local GHOST, MIRAGE, PHANTOM, and QUANTUM workflows.

**Architecture:** Keep the current React/Vite/GitHub Pages frontend. Add Firebase Web SDK configuration, Google Authentication, Firestore repositories, deny-by-default Standard Firestore rules, and local Auth/Firestore emulators. Store only bounded synthetic/demo workspace and case metadata; keep media bytes local, and keep connectors fixture-only. With no Firebase config, the local demo stays available and isolated.

**Tech Stack:** React, TypeScript, Vite, Firebase Web SDK, Firestore Security Rules, Firebase Local Emulator Suite, Vitest, `@firebase/rules-unit-testing`.

**Spec:** `docs/superpowers/specs/2026-11-15-firebase-phase-1-to-10-design.md`

**Implementation status (2026-11-16):** The source implementation for Phases 1–10, including all four engine demos and Firebase workspace workflows, is complete. Local unit/UI tests and the production build run without Java. The Firestore/Auth emulator suite is configured as a Java 21 hosted CI gate before Pages deployment; it has not run yet because this branch has not been pushed. No cloud project or deployment was created from this workspace.

## Global Constraints

- Public UI remains a static GitHub Pages site; no server secrets or privileged credentials enter the frontend.
- Firebase Authentication and Firestore are optional until the user configures the project; no state migration from local storage happens automatically.
- Only operator-allowlisted pilot UIDs with workspace membership may access Firebase records.
- Firebase-persisted records remain synthetic/demo-only until data policy and retention are approved.
- Firestore Security Rules deny by default; role selection in the client is never authorization.
- No Cloud Storage, Cloud Functions, live connectors, arbitrary URL fetches, attachment execution, AI API calls, or paid services.
- Use Firestore Standard edition; do not create or modify a remote database or project in this plan.
- Every Firebase failure, permission denial, missing configuration, or unavailable engine is explicit in the UI; it never appears as a clean finding.
- Do not deploy Firebase or push to GitHub.

## Review Focus

- Unconfigured Firebase mode must not break the existing local demo or leak local records to Firebase; test missing/partial config and ensure no repository calls happen.
- An authenticated non-allowlisted identity must not read or create workspaces; test unauthenticated, non-member, and allowlist cases.
- A member in one workspace must not read or mutate another workspace's cases, evidence summaries, findings, membership, exports, or audit activity; test cross-workspace IDs.
- Analysts/reviewers must not edit roles, immutable ownership/timestamps, or out-of-role fields; test privilege escalation and schema pollution.
- Malformed and oversized data, state-transition violations, and quota/network failures must produce bounded rejection and clear UI errors; test invalid records, app errors, and connection failure.

---

## File Map

- `src/firebase/config.ts`: parse optional public Firebase web configuration and initialize Auth/Firestore/emulators.
- `src/firebase/auth.ts`: Google sign-in, sign-out, auth-state subscription, and invite-only gate state.
- `src/firebase/schema.ts`: versioned Firestore document types and validation helpers.
- `src/firebase/repository.ts`: typed workspace, membership, case, finding, audit, and backup operations.
- `src/firebase/state.ts`: choose Firebase or local-demo mode; expose shared state and mutations to the console.
- `src/App.tsx`: replace UI-only role selector with auth/workspace state, membership-backed permissions, loading/error states, and Firebase workspace navigation.
- `src/DemoPages.tsx`: adjust sign-in, settings, governance, workspace, case, evidence, and reports controls for Firebase mode and demo-only limits.
- `src/demo.ts`: retain browser-local demo data and clearly distinguish local role preview from Firebase user roles.
- `src/styles.css`: style auth states, workspace picker, membership manager, and clear error/empty/loading states responsively.
- `src/main.tsx`: initialize providers only after validated configuration.
- `.env.example`: document optional public Firebase config values.
- `.github/workflows/deploy.yml`: pass public GitHub Actions repository variables to Vite builds when configured; default to local/demo build otherwise.
- `firebase.json`: configure Auth and Firestore emulators and point to versioned rules/index files; emulator-only demo project ID.
- `firestore.rules`: deny-by-default allowlist, workspace membership/role checks, strict schemas, immutable fields, and role boundaries.
- `firestore.indexes.json`: only required workspace/case query indexes.
- `tests/firebase/rules.test.ts`: emulator rule tests for allowed/denied reads and writes, schema, roles, and tenant boundaries.
- `tests/firebase/repository.test.ts`: repository and Firestore Emulator workflow tests.
- `tests/ui/firebase-mode.test.tsx`: UI tests for no-config fallback, unauthenticated, uninvited, and authenticated modes.
- `vite.config.ts`: test config if needed without changing Pages base path.
- `scripts/test-firebase-rules.mjs`: cross-platform local emulator test launcher with a writable CLI config directory.
- `package.json` / `package-lock.json`: Firebase SDK, emulator test dependencies, scripts. Pin the Firebase 12-compatible test stack; call Firebase CLI through an exact `npx firebase-tools@15.36.0` version to avoid pulling the CLI's large runtime into the app install.
- `README.md`: setup, no-billing scope, local emulator steps, test workflow, Firestore UID allowlist bootstrap, GitHub variables, and current limitations.
- `docs/product/phase-2-product-and-safety-requirements.md`: reconcile current-state language and document Firebase/synthetic-only gates.
- `docs/architecture/phase-3-system-architecture-and-threat-model.md`: replace conflicting backend proposal with the user-approved Firebase architecture and its limits.
- `docs/roadmap/phase-1-to-20.md`: reflect what is implemented and what remains gated.

## Task 1: Build the Firebase test harness and configuration boundary

**Files:** modify `package.json`, `package-lock.json`, `vite.config.ts`; create `firebase.json`, `.env.example`, `src/firebase/config.ts`, `tests/firebase/config.test.ts`.

**Interfaces:** `readFirebaseConfig(env): FirebasePublicConfig | null`; `initializeFirebase(config): FirebaseHandles`; no Firebase project values are hardcoded.

- [x] Add a test that missing configuration returns local mode, partial configuration is rejected with a useful error, and complete public configuration initializes Firebase without an Admin SDK.
- [x] Run the configuration test and confirm it fails before implementation.
- [x] Add Firebase SDK, Vitest, React Testing Library, and Firebase Rules unit-testing dependencies; configure Auth and Firestore emulator ports with project ID `demo-obscura`.
- [x] Implement config parsing and one-time Firebase initialization; connect Auth/Firestore emulators only in explicit development/test mode.
- [x] Run config tests and `npm run build`; confirm the current landing page and local demo still build without Firebase values.

## Task 2: Implement identity and pilot access state

**Files:** create `src/firebase/auth.ts`, `src/firebase/state.ts`, `tests/ui/auth-state.test.tsx`; modify `src/App.tsx`, `src/DemoPages.tsx`.

**Interfaces:** `subscribeAuth(): Unsubscribe`; `signInWithGoogle(): Promise<User>`; `signOutUser(): Promise<void>`; auth view state is `unconfigured | signedOut | checkingPilot | uninvited | ready | error`.

- [x] Test no-config local demo, signed-out Firebase mode, allowlisted user, uninvited user, sign-out, and auth error states.
- [ ] Run the UI tests and confirm the Firebase states are initially missing.
- [x] Implement Google sign-in and sign-out using Firebase Auth; never treat a signed-in UID as workspace access by itself.
- [x] Replace demo role sign-in screen in configured mode with real account state and a clear “not on the pilot allowlist” message.
- [x] Preserve explicit browser-local demo sign-in only when Firebase configuration is absent; never merge demo state into a Firebase workspace.
- [x] Run UI tests and `npm run build`.

## Task 3: Define workspace data model and secure Firestore rules

**Files:** create `src/firebase/schema.ts`, `firestore.rules`, `firestore.indexes.json`, `tests/firebase/rules.test.ts`.

**Interfaces:** versioned workspace/case/finding/member/audit documents with bounded fields; roles `owner | admin | analyst | reviewer`; status transitions `OPEN -> IN REVIEW -> CLOSED` and permitted reopen path defined in schema.

- [x] Write emulator tests for unauthenticated denial; unallowlisted denial; allowlisted workspace bootstrap; membership reads; allowed and denied role operations; cross-workspace access; immutable owner/timestamp fields; strict field schemas; size limits; invalid status transitions; audit integrity, all engine lead choices, and member removal.
- [ ] Run the rules tests and confirm they fail before rules are implemented.
- [x] Author Rules with default deny, project-operator-maintained `/pilotAllowlist/{uid}`, tenant-scoped `/workspaces/{workspaceId}` documents, member docs, cases, findings, and append-style activity.
- [x] Require allowlisted UID for workspace creation; require an atomic owner membership and owner workspace; prevent self-escalation; allow only owner/admin to add/remove an already-allowlisted member; ensure ordinary member cannot change membership roles.
- [x] Ensure roles: analysts create/update cases and findings; reviewers read and append review decisions but cannot mutate original case/evidence fields; admins manage members and workspace settings; no client can write allowlist records.
- [ ] Validate Rules syntax and run all emulator attack tests. Review every path for unintended `get`, `list`, `create`, `update`, and `delete` access.

## Task 4: Add Firestore repository and case workflow

**Files:** create `src/firebase/repository.ts`, `tests/firebase/repository.test.ts`; modify `src/App.tsx`, `src/DemoPages.tsx`.

**Interfaces:** `createWorkspace`, `listWorkspaces`, `watchWorkspace`, `addMember`, `removeMember`, `listCases`, `createCase`, `updateCase`, `deleteCase`, `saveFinding`, `appendAudit`, and versioned export/import functions. Every operation takes the authenticated Firebase user and workspace ID; Firestore Rules remain the security boundary.

- [ ] Test workspace creation/member bootstrap, CRUD, role-based failures, case searching/status changes, findings, audit metadata, and cross-workspace rejection against Firestore Emulator.
- [ ] Run repository tests and confirm they fail before repository implementation.
- [x] Implement the repository and query indexes; include only synthetic metadata and findings, never file contents, secrets, or emails in Firestore.
- [x] Adapt console callbacks to asynchronous repository operations with loading, empty, permission-denied, offline, quota, and retry states.
- [x] Add workspace creation and member management by Firebase UID, with role options constrained by current role and pilot allowlist.
- [x] Ensure local demo controls continue to use only local storage and use demo-only role labels; Firebase mode derives role from the signed-in user's membership document.
- [ ] Run repository/rules tests and production build.

## Task 5: Finish governance, evidence handling, reports, and recovery

**Files:** modify `src/DemoPages.tsx`, `src/App.tsx`, `src/demo.ts`, `src/styles.css`; create `tests/ui/governance.test.tsx`, `tests/firebase/backup.test.ts`.

**Interfaces:** JSON backup version 2 is workspace-scoped, validates all fields and limits, carries provenance and source status, and can be restored only into a workspace where caller is authorized.

- [ ] Test that cloud mode blocks uploads, cloud-saves only synthetic/demo data with an explicit confirmation, and displays the retention gate; test policy and source approval states.
- [ ] Test report exports preserve provenance, per-check uncertainty, and demo/local status; test invalid, oversized, foreign-workspace, and version-mismatched backup restore rejection.
- [x] Implement a governance checklist for classification, approved sources, retention, deletion, access, and backup/restore status; default every live source and real-evidence intake to disabled.
- [x] Implement Firebase workspace report/evidence-register export and validated authorized backup restore; keep MIRAGE file inspection browser-local and store only bounded digest/check summary.
- [x] Mark connector catalog entries as fixtures only; require a completed source governance record before a connector could be enabled, while leaving all external requests unimplemented.
- [ ] Verify reduced-motion, visible focus, mobile layout, safe demo labels, and explicit Firebase error states.
- [ ] Run relevant tests and production build.

## Task 6: Reconcile docs, run final verification, and prepare handoff

**Files:** update `README.md`, `docs/product/phase-2-product-and-safety-requirements.md`, `docs/architecture/phase-3-system-architecture-and-threat-model.md`, `docs/roadmap/phase-1-to-20.md`.

- [x] Update docs to distinguish implemented Firebase Emulator/local path from a Firebase project that the user has yet to configure.
- [x] Document how to create/select a project, enable Google auth, add authorized domains, create a Standard Firestore database, add the initial operator allowlist UID, and set public GitHub Actions variables; warn not to enable billing without approval.
- [ ] Run unit/UI and emulator security tests, then `npm run build` and `git diff --check`.
- [ ] Start the local site and complete a browser walkthrough of local-demo fallback, Firebase sign-in states, workspace creation, membership roles, GHOST/MIRAGE/PHANTOM/QUANTUM case saving, exports, denial states, and mobile layout.
- [x] Confirm git changes are uncommitted, no production Firebase resources were created, and no GitHub push/deployment was performed.

## Known verification constraints

There is no Firebase account/project/configuration and this workstation has no Java runtime. Firebase Emulator Suite security tests require Java 21+, so the GitHub Pages workflow now provisions Temurin 21 on a hosted runner, runs unit/UI tests, emulator rules tests, and the production build, then allows Pages deployment only after they pass. Do not substitute a production Firebase project for local rule tests. The hosted check has not run until the workflow is pushed to GitHub.
