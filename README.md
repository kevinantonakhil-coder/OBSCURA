# OBSCURA — Digital Trust & Intelligence

**SEE BEYOND THE SURFACE.**

Phase 1 is a responsive React and TypeScript frontend preview for OBSCURA. It includes a public landing page and a separate Intelligence Console shell. Every case, chart and finding shown in the console is fictional demo content. The engine screens are workflow previews: no backend analysis, upload, URL visit, external lookup or attachment execution is performed.

## Local setup

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Vite prints a local address to open in your browser. To create a production build locally, run `npm run build`, then `npm run preview` to view that build.

Copy `.env.example` to `.env.local` only when a future local service needs configuration. Phase 1 does not need environment variables or credentials. Do not put secrets in frontend variables: values prefixed with `VITE_` are exposed to browser users.

## Phase 1 includes

- Public OBSCURA product landing page and responsive Intelligence Console.
- Overview dashboard with illustrative metrics, SVG signal chart, engine status and expandable activity rows.
- MIRAGE media review workflow; GHOST defensive domain and message workflow; PHANTOM public impersonation-signal review without face-based identity identification; QUANTUM local hash and educational proof workflow.
- Investigation list and search, evidence vault, case files, report templates and settings shell.
- Keyboard focus treatment, semantic controls, reduced-motion support and narrow-screen layouts.
- Clear simulated-data labels. No analysis service or persistence backend is connected.

## Planned phases

1. **Frontend preview (current):** establish visual identity, public site, console navigation and safe demo workflows.
2. **Product design and threat model:** define users, authorization, retention, evidence handling, abuse controls and review requirements before connecting sensitive workflows.
3. **Backend foundation:** authentication, authorization, case/evidence persistence, audit history and secure file handling.
4. **Engine integrations:** implement and validate each defensive engine separately, with provenance, limits and human review.
5. **Operational readiness:** security review, accessibility checks, monitoring, deployment configuration and documented incident response.

These are planning notes, not promises that live analysis is available. The GitHub Pages workflow publishes only this static frontend preview; it does not connect backend analysis services.

## GitHub

The project source is in the public `kevinantonakhil-coder/OBSCURA` repository. The `main` branch includes a GitHub Actions Pages workflow. After adding that workflow, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** and push changes to `main` to trigger a deployment. Review `.gitignore` before committing; it excludes dependencies, build output, environment files and TypeScript build metadata.

## Stack

React, TypeScript, Vite, Tailwind CSS, Framer Motion and Lucide. Styling uses custom CSS tokens and components alongside Tailwind's Vite integration.
