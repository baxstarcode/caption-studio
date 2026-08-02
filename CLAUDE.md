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

## Pattern source
The proven reference implementation is the **baxstar-pontoon** repo
(local checkout: `~/Desktop/baxstar-pontoon`; remote: github.com/baxstarcode/baxstar-pontoon).
Copy its `Code.gs` proxy shape, mock server, and deploy runbook rather than inventing new ones.

## The sponsor list is shared — check both sides
`MENTIONS` in `app/index.html` and the `SPONSORS` map in
[baxstarcode/baxstar-ember](https://github.com/baxstarcode/baxstar-ember)'s
`src/baxstar-ember.jsx` are the same ten sponsors. **When either changes, check the other.**
They drifted once already: Ember ended up tagging `@vexusboats` when Brady's sponsor is
`@therealvexusboats` — a different account, notified on every sponsored post. Two front
doors is deliberate (this is the bookmarkable one-tap URL at the lake, Ember is the command
center), so the drift is the standing cost and this is the first thing to check.

## Tests
`.devtest/mock_gas_server.py` mirrors the proxy contract for manual bench runs.
`.devtest/app-e2e.mjs` drives `app/index.html` in headless Chromium with the proxy
intercepted — no `sk-ant-` key, no billed call, no deploy:

```bash
npm install --no-save playwright && npx playwright install chromium
node .devtest/app-e2e.mjs
```

## Doc discipline (Baxstar_AI_Context Rule 15, 2026-08-01)

**After finishing any piece of work here, update Brady's docs before the turn ends.** Not a
draft for him to paste — write it.

- This tool's build progress goes in `BUILD_STATE.md` (the repo's own ledger, and the
  authority for build state). Session narrative goes to `Baxstar_Handoff_Log`; anything
  touching Ember goes to `Baxstar_Ember_Handoff_Log` instead — never both.
- Any durable rule or decision must ALSO land in its owning domain doc per the router
  (`Baxstar Source of Truth`), not only in a log.
- **Unless it's already there.** Read first — reads are free. A duplicate entry is worse
  than none: it pushes real content toward the trim threshold and creates two versions of
  one fact that can later disagree. If existing text is wrong or incomplete, correct it in
  place rather than appending a second copy.
- Verify by re-reading the live doc. A write tool's success response is not proof — this
  rule exists because prior tooling falsely reported successful writes.

What counts as finishing: shipped code, a pushed branch or PR, an adopted decision, a
discovered bug, a corrected earlier claim. Exploration that reached no conclusion still
gets one line.
