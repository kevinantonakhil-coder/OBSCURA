# OBSCURA — Digital Trust & Intelligence

**SEE BEYOND THE SURFACE.**

The project is a responsive React and TypeScript browser-local demonstration of the OBSCURA workflows through Phase 10. It includes the public landing page and a separate Intelligence Console. Cases and saved findings persist in this browser's local storage. All bundled records and connector responses are synthetic demo data.

## Local setup

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Vite prints a local address to open in your browser. To create a production build locally, run `npm run build`, then `npm run preview` to view that build.

The demo does not need environment variables, credentials, or API keys. Do not put secrets in frontend variables: values prefixed with `VITE_` are exposed to browser users.

## Working demo workflows

- Create, search, open, update, and delete local demo cases. Add review notes and inspect saved findings and evidence summaries.
- **GHOST (Phase 9 demo):** deterministic text-only checks for domain strings and sanitized email headers. No DNS, registration, reputation, URL, or mailbox lookups.
- **MIRAGE (Phase 10 demo):** locally inspect PNG/JPEG signatures and bounded header metadata, calculate SHA-256 for files up to 25 MB, and save a review summary. No image bytes are uploaded or saved; metadata and a digest cannot establish authenticity.
- Export case summaries, evidence registers, or a browser-state backup as JSON.
- Review Phase 7 data-handling rules, inspect the audit list, and run Phase 8 connector fixtures. Fixture toggles never contact external sources.
- Choose an Analyst, Reviewer, or Workspace admin demo role. The role preview changes interface permissions only; it does not secure stored data.
- Responsive landing and console layouts, visible keyboard focus, and reduced-motion support.

## Demo boundaries

- This is not a production SOC or a live threat-intelligence service. GHOST and MIRAGE use local rules only; no AI API, external feed, DNS lookup, URL visit, attachment execution, or backend request is made.
- Browser local storage is not encrypted, is device/browser-specific, and is not appropriate for real incidents, personal data, secrets, or confidential evidence. Use synthetic inputs only.
- Phase 4 Firebase Authentication is not connected because this repository has no Firebase project configuration. The sign-in page is a demo role picker, not account authentication.
- Phase 5 authorization is a role-based UI demonstration. Real permission enforcement requires a protected backend and server-side rules.
- Phase 6 server persistence, backups, and recovery drills are not implemented. Downloaded JSON is a user-created demo export, not a managed backup service.
- Phase 8 connector examples are bundled fixtures and may not reflect current threat information.
- PHANTOM and QUANTUM are roadmap previews beyond this Phase 10 demo; neither engine performs analysis.

## Planned phases

See the [20-phase product roadmap](docs/roadmap/phase-1-to-20.md). Phase 2 product and safety requirements are a complete working draft pending review. Phase 3 architecture remains a proposal; Firebase is the selected Phase 4 authentication direction, but no project is connected. Later roadmap phases describe proposed milestones, not live capabilities or launch promises. GitHub Pages publishes a static frontend only.

Phase 2 product and safety requirements: [docs/product/phase-2-product-and-safety-requirements.md](docs/product/phase-2-product-and-safety-requirements.md).

Phase 3 proposed architecture and threat model: [docs/architecture/phase-3-system-architecture-and-threat-model.md](docs/architecture/phase-3-system-architecture-and-threat-model.md).

## GitHub

The project source is in the public `kevinantonakhil-coder/OBSCURA` repository. Its GitHub Actions Pages workflow builds on pushes to `main`. These local changes are not published automatically; publish only after reviewing and pushing them. `.gitignore` excludes dependencies, build output, environment files and TypeScript build metadata.

## Stack

React, TypeScript, Vite, Tailwind CSS, Framer Motion and Lucide. Styling uses custom CSS tokens and components alongside Tailwind's Vite integration.
