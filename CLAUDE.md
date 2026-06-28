# Baxstar Caption Studio — repo rules

## Locked decision (2026-06-28, by Brady)
Architecture is **proxy**, not artifact. Static frontend on GitHub Pages (`index.html`)
+ a Google Apps Script proxy (`backend/Code.gs`) that holds the Anthropic key in Script
Properties. This mirrors the proven **baxstar-pontoon** pattern.

- Do NOT build the claude.ai-artifact version.
- Do NOT call `api.anthropic.com` directly from the browser. The dead-end client-side-key
  version lives in `/reference` for history only — never build on it.

## The key — non-negotiable
The Anthropic API key lives ONLY in Apps Script Script Properties. Never in this repo,
never in `index.html`, never in any committed file. `PROXY_URL` and `PROXY_TOKEN` in
`index.html` stay as clearly-marked placeholders until Brady deploys.

## How this repo is built
`BUILD_STATE.md` is the source of truth for build progress. Run `/caption` to execute one
increment:
- one step per run — the first unchecked `[ ]` that is NOT marked `[BRADY]`
- COMPLETE files only, never snippets
- mirror baxstar-pontoon's patterns: `backend/Code.gs` (proxy shape),
  `.devtest/mock_gas_server.py` (mock harness), the deploy runbook
- never touch a `[BRADY]` step; if only `[BRADY]`/blocked steps remain, say so and stop

See `.claude/commands/caption.md`.

## Pattern source
The proven reference implementation is the **baxstar-pontoon** repo
(local checkout: `~/Desktop/baxstar-pontoon`; remote: github.com/baxstarcode/baxstar-pontoon).
Copy its `Code.gs` proxy shape, mock server, and deploy runbook rather than inventing new ones.
