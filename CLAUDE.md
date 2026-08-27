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

Testing follows the proportional rule in Baxstar_Build_Standards: targeted changes get
targeted verification; releases and risky changes get broader proof.

## Source-of-truth preflight and doc discipline

For work that changes Caption Studio code/config/live behavior, depends on a prior project
decision, or states current project status:

1. Read `BUILD_STATE.md`, this file, and any relevant repo deploy/test documentation first.
2. A Drive-capable chat agent also follows **Baxstar Source of Truth Router**
   (`1AgIxAj0YM8XNTTMHVcJInNAquLKnon-WB4i2DMzTzRQ`) and the canonical
   **Baxstar_Build_Standards** (`1VfETYcTNktp-6cZLVAHbAUDBmR1NqlwMGCgl2Xo5DY0`).
3. Build-only agents that cannot read Drive work repo-first from these synced constraints
   and must not claim Drive was updated.

After durable state changes:

- Build progress belongs in `BUILD_STATE.md`.
- Recent changes/open items go to `Baxstar_Handoff_Log` under its established discipline;
  Ember-specific work goes to `Baxstar_Ember_Handoff_Log` instead — never both.
- Durable cross-project rules/decisions also go to the Router-designated owning Drive source.
- Use `Baxstar_Agent_Relay` only when another AI has a concrete next action, unresolved
  dependency, or important current-state handoff.
- Read first; correct existing text in place instead of creating duplicate versions.
- Verify Drive writes by re-reading them. A tool success response is not proof.
- Exploration with no adopted outcome does not require a ceremonial log/Relay write.

Do not expand a requested change into retrofit-on-touch, mandatory commercialization work,
blanket testing/deploy documentation, or a ceremonial CEO/CFO/IT review. Apply the current
Gremlin-clean build standard proportionally.
