# OBSCURA — Digital Trust & Intelligence

**SEE BEYOND THE SURFACE.**

OBSCURA is a polished React, TypeScript and Vite cybersecurity demo with a public landing page, an isolated browser-local console, and an optional Firebase-backed synthetic pilot. The Firebase project is not connected in this repository. Nothing has been deployed or published as part of this implementation.

## Run the local demo

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the local address Vite prints. With Firebase values left blank, the public site and browser-local demo work without accounts or cloud services.

```sh
npm test
npm run build
```

The Firebase Security Rules suite needs the Firebase Local Emulator Suite and Java 21 or newer. You do not need to install Java locally: the GitHub Actions verification job installs Java 21 on its hosted runner, runs the emulator suite, and only allows the Pages deployment job to start if verification passes.

```sh
npm run test:rules
```

For a local run, the first run downloads Firebase CLI/emulator tooling. The suite uses the isolated `demo-obscura` project ID and does not connect to a real Firebase project. Pushing a change to `main` runs the same checks in GitHub Actions before publishing the site.

## Firebase pilot configuration

Firebase integration is optional. To run the connected path, the project owner must create/select a Firebase project, register a Web app, enable Google Authentication, create a Firestore Standard database, and enable Firestore rules before use.

1. Copy `.env.example` to `.env.local` and add the Firebase Web app values. These `VITE_FIREBASE_*` values are public client configuration, not service-account secrets.
2. Add the deployed site origin to Firebase Authentication's authorized domains.
3. Deploy the checked-in Firestore rules to the selected project. Never add Firebase Admin credentials to this repository or browser build.
4. Sign in, then add the account's Firebase UID to `/pilotAllowlist/{uid}` in the Firebase Console. Allowlist writes are intentionally blocked from the app.
5. Create a workspace. To add colleagues, first allowlist each colleague's UID, then assign Analyst or Reviewer membership from Workspace members.

GitHub Pages builds read optional repository **Variables** named `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`. Leave them unset to publish the static browser-local version. Do not add service-account JSON, private keys, or other secrets.

No Firebase project, database, or billing plan is created or changed by this repository work. No paid API or external intelligence source is used. Review the project's usage and billing settings before connecting a real Firebase project.

## Working demo features

- Responsive OBSCURA public landing page and separate Intelligence Console.
- Browser-local demo cases, reports, JSON backup/restore, governance guidance, audit preview, and fixture-only connector examples.
- **GHOST:** deterministic local checks for domain text and sanitized email-header text. No DNS, registration, reputation, mailbox, URL, or network requests.
- **MIRAGE:** local PNG/JPEG header inspection and SHA-256 hashing. Original bytes are not uploaded or saved; a digest does not establish authenticity.
- **PHANTOM:** text-only brand and handle review cues. It does not identify people, compare faces, or verify live account ownership.
- **QUANTUM:** local SHA-256 file hash, ephemeral ECDSA signature exercise, and a deliberately insecure toy zero-knowledge protocol example. None of these demos establishes real-world identity or production security.
- Optional Firebase Auth and Firestore workflow: pilot UID allowlist, membership roles, synthetic workspaces, cases, bounded per-check findings, append-only activity, member management, and schema-validated JSON export/restore.
- Firestore Rules deny by default and enforce workspace membership and roles. Rules tests run in the local emulator; GitHub Actions provisions Java 21 so local Java installation is optional.

## Safety and data boundaries

- The connected pilot is intended for synthetic or approved public test data. Firestore validates document shape, not the meaning of user-entered text; never enter real incident details, personal data, or secrets. It rejects evidence uploads and does not store raw GHOST text, PHANTOM profile text, MIRAGE image bytes, QUANTUM source files, or private signing keys.
- Analysis runs locally in the browser. Suspicious URLs are never opened or fetched, attachments are never executed, and no live threat-intelligence source is connected.
- Signals and priorities are review cues, not probabilities or accusations. Unknown and unavailable checks are shown explicitly.
- Browser local storage is not encrypted and is device/browser-specific. It is not appropriate for real incidents, confidential evidence, secrets, or personal data.
- JSON export/restore is a user-triggered convenience workflow, not a managed backup service or atomic disaster-recovery system. Removing a Firebase membership does not delete prior records.
- Do not use real case evidence until data location, access, retention, deletion, incident response, and recovery policies are approved and tested.
- PHANTOM and QUANTUM are local educational demonstrations, not production identity or cryptographic services. No ML model is included; deterministic rules remain usable without an AI API.

## Product plan

The complete 20-phase roadmap is in [docs/roadmap/phase-1-to-20.md](docs/roadmap/phase-1-to-20.md). Current Firebase design and explicit limits are in [docs/superpowers/specs/2026-11-15-firebase-phase-1-to-10-design.md](docs/superpowers/specs/2026-11-15-firebase-phase-1-to-10-design.md).

Phase 2 requirements: [docs/product/phase-2-product-and-safety-requirements.md](docs/product/phase-2-product-and-safety-requirements.md).

Phase 3 architecture and threat model: [docs/architecture/phase-3-system-architecture-and-threat-model.md](docs/architecture/phase-3-system-architecture-and-threat-model.md).

## GitHub Pages

The repository's GitHub Actions workflow builds the frontend and publishes it when a change is pushed to `main`. This implementation did not push or deploy. Review the source and workflow before publishing. Firebase client configuration is optional; blank GitHub Variables produce the browser-local build.
