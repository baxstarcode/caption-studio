# Baxstar Caption Studio

Captures pictures, identifies images and creates a two-sentence on-brand description relevant to the image, applies relevant hashtags, and mentions relevant sponsors whose products are seen in the image.

---

## Quick summary

- Architecture: proxy-based. Static frontend served from GitHub Pages (landing at `index.html`, the TOOL at `app/index.html`). A Google Apps Script proxy (`backend/Code.gs`) holds the Anthropic API key in Script Properties and forwards requests to Anthropic. This mirrors the baxstar-pontoon pattern.
- Non-negotiable: The Anthropic API key (the `sk-ant-` key) must never be committed to this repo, to any HTML, or to any file. It lives only in Apps Script Script Properties.
- Do NOT build the claude.ai-artifact version. Client-side keys and direct browser calls to api.anthropic.com are forbidden; any historical client-side attempts live only in `/reference` for history.

---

## Locked decisions (source: 2026-06-28)

1. Architecture is proxy, not artifact. The Apps Script proxy is the canonical server-side component and must contain the API secret in Script Properties.
2. The real `PROXY_URL` and `PROXY_TOKEN` are committed in `app/index.html`; the only secret that must not be committed is the `sk-ant-` Anthropic key.
3. Follow the baxstar-pontoon proxy shape and patterns for `backend/Code.gs`, the mock server, and the deploy runbook.

---

## Where to look first

Always read these files before making build-related changes:

- `BUILD_STATE.md` — source of truth for build progress and the one-step-per-run rule.
- This README and the repo-level rules.
- `.claude/commands/caption.md` — local command guidance.

If your change affects runtime, behavior, or depends on prior project decisions, also consult the Drive-hosted Canonical documents listed in repo rules:
- Baxstar Source of Truth Router
- Baxstar_Build_Standards

(These Drive documents are referenced by ID in repo governance; follow the repo's preflight checklist.)

---

## Build process and discipline

- BUILD_STATE.md is the single source of truth for build progress. Run `/caption` to execute one build increment: mark the first unchecked `[ ]` that is NOT `[BRADY]` and complete it with a fully finished file (no snippets).
- Do not modify steps tagged `[BRADY]`.
- Follow the proportional testing discipline: small changes get focused tests; releases/risky changes get broader verification.

---

## Pattern source

Use the proven reference implementation in `baxstar-pontoon` (local: `~/Desktop/baxstar-pontoon`, remote: `github.com/baxstarcode/baxstar-pontoon`). Reuse its `Code.gs` proxy shape, `.devtest/mock_gas_server.py`, and the deploy runbook — do not invent new proxy shapes.

---

## Sponsors

The sponsor list is shared across two places:
- `MENTIONS` in `app/index.html`
- `SPONSORS` map in `baxstarcode/baxstar-ember` at `src/baxstar-ember.jsx`

They must match: when one changes, check the other. The repo purposely uses two entry points (this bookmarkable front-door and Ember command center) — avoid drifting accounts.

---

## Tests and local verification

This repo contains a mock Apps Script server and an end-to-end harness for dev verification. Use these for safe, non-billed testing:

- Mock GAS server: `.devtest/mock_gas_server.py` mirrors the proxy contract for manual bench runs.
- Headless E2E: `.devtest/app-e2e.mjs` drives `app/index.html` in headless Chromium with the proxy intercepted.

Install and run the end-to-end test with:

```bash
npm install --no-save playwright && npx playwright install chromium
node .devtest/app-e2e.mjs
```

These tests do not require an `sk-ant-` key and should not make billed calls.

---

## Development notes

- The Apps Script proxy (`backend/Code.gs`) holds the Anthropic key in Script Properties. Never put the key in the repo.
- `app/index.html` contains `PROXY_URL` and `PROXY_TOKEN` values used by the frontend; this is an accepted soft gate for the project.
- Historical client-side attempts are kept in `/reference` for audit/history only and must not be used as a basis for production builds.

---

## How to contribute

1. Read `BUILD_STATE.md`, this README, and related governance documents.
2. Make a small, focused change tied to a BUILD_STATE step. Update `BUILD_STATE.md` and any relevant handoff logs (`Baxstar_Handoff_Log` or `Baxstar_Ember_Handoff_Log`) after durable changes.
3. Run the appropriate `.devtest` verification for your change.
4. Keep any Drive writes (if used) consistent with the repo's rules and verify them by re-reading.

---

## Contact and provenance

- Reference implementation: github.com/baxstarcode/baxstar-pontoon
- Repo owner: baxstarcode

---

## License

This repository does not include a license file; add one if you intend to change the distribution terms.
