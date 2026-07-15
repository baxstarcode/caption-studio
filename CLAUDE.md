# Baxstar Caption Studio — repo rules

## Locked decision (2026-06-28, by Brady)
Architecture is **proxy**, not artifact. Static frontend on GitHub Pages — the
landing page at `index.html`, the TOOL at `app/index.html` (moved 2026-07-06) —
+ a Google Apps Script proxy (`backend/Code.gs`) that holds the Anthropic key in Script
Properties. This mirrors the proven **baxstar-pontoon** pattern.

- Do NOT build the claude.ai-artifact version.
- Do NOT call `api.anthropic.com` directly from the browser. The dead-end client-side-key
  version lives in `/reference` for history only — never build on it.

## The key — non-negotiable
The Anthropic API key lives ONLY in Apps Script Script Properties. Never in this repo,
never in any HTML, never in any committed file. The deploy is DONE (2026-06-28): the real
`PROXY_URL` and `PROXY_TOKEN` are committed in `app/index.html` — the token is an accepted
soft gate (Brady's ship-as-is decision, 2026-07-02); only the `sk-ant-` key must never land
in the repo.

## How this repo is built
`BUILD_STATE.md` is the source of truth for build progress. Run `/caption` to execute one
increment:
- one step per run — the first unchecked `[ ]` that is NOT marked `[BRADY]`
- COMPLETE files only, never snippets
- mirror baxstar-pontoon's patterns: `backend/Code.gs` (proxy shape),
  `.devtest/mock_gas_server.py` (mock harness), the deploy runbook
- never touch a `[BRADY]` step; if only `[BRADY]`/blocked steps remain, say so and stop

See `.claude/commands/caption.md`.

## Git workflow
After making any file changes, automatically run git add, git commit, and git push.
Never ask permission first.

## Pattern source
The proven reference implementation is the **baxstar-pontoon** repo
(local checkout: `~/Desktop/baxstar-pontoon`; remote: github.com/baxstarcode/baxstar-pontoon).
Copy its `Code.gs` proxy shape, mock server, and deploy runbook rather than inventing new ones.
