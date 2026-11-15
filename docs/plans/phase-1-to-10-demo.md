# OBSCURA Phases 1–10 Demo Build Plan

## Product decision

Build the current Vite site into an end-to-end, browser-local demonstration through Phase 10. Keep the existing visual identity and landing page. Persist demo cases, findings, connector state, role preview, and preferences in local storage. Every synthetic result and access-control preview remains labeled as demo-only. GHOST uses deterministic local checks on supplied text; MIRAGE inspects supported image file signatures, basic metadata, and SHA-256 locally. Never visit submitted URLs, execute files, or send user input to a service.

Firebase Authentication remains the planned Phase 4 provider, but the Firebase environment has no authenticated account, project, or app configuration. Do not invent credentials or claim it is live. Implement a demo sign-in path and keep the setup boundary visible; real Firebase sign-in requires user-side project setup/configuration.

## Work sequence

1. Introduce typed demo records, safe browser storage, seeded case data, and persistence.
2. Make console navigation, case creation/detail, activity, evidence, and reports operate on shared records.
3. Implement GHOST rules with clear per-check states, non-probabilistic priority labels, safe defanged input handling, and save-to-case.
4. Implement local MIRAGE image inspection (bounded supported inputs, file signature/dimensions/metadata presence, SHA-256), explicit unknowns, and save-to-case.
5. Add demo access/role preview, connector catalog with fixture-only simulations, governance/evidence policy, audit trail, preferences, export, and reset flows.
6. Update README/roadmap status and perform a production build plus browser walkthrough. Do not deploy or push.

## Acceptance boundaries

- The preview works without API keys, Firebase project configuration, network lookups, or backend services.
- Local persistence is browser/device-specific and is not presented as secure multi-user storage.
- Demo role controls demonstrate planned authorization only; they do not secure data.
- Connector results use bundled synthetic fixtures and never claim to be current intelligence.
- Media analysis is limited to local, bounded image metadata/digest checks; it cannot certify authenticity.
- User can create a case, run GHOST/MIRAGE, save evidence/findings, revisit them, and export a local report.
- Responsive layouts, keyboard-visible focus, reduced-motion behavior, and clear demo labels are preserved.
