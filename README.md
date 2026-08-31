# Baxstar Caption Studio

Photo in, on-brand fishing caption out. Point it at a fish picture and it identifies the
catch, drafts a two-sentence caption in Baxstar voice, picks the hashtags, and tells you
which sponsors to tag before you post.

**Live**

| | |
|---|---|
| **The tool** (bookmark this) | https://baxstarcode.github.io/caption-studio/app/ |
| Landing page | https://baxstarcode.github.io/caption-studio/ |
| Content360 handoff pilot | https://baxstarcode.github.io/caption-studio/app/content360/ |

The pilot route is under review and is deliberately not linked from the tool. See
`CONTENT360_BRIDGE.md`.

---

## What it does

- **Photos in three ways** — camera roll, the rear camera straight from the lock screen
  (`capture="environment"`, fish still in hand), or shared in from the phone's share sheet.
  Up to 6 per draft, all through one intake.
- **Reads the photo** — Claude vision identifies the species and drafts the caption.
- **Sponsors** — 10 sponsor chips. The ones the model can actually see in the frame come
  back pre-armed; the rest you toggle yourself.
- **Hashtags hard-capped at 5**, with `#getyourbassingear` taking one of those slots on
  bass posts and sitting directly above the business-name block.
- **No @handles or lake in the caption text.** A typed `@handle` notifies nobody, and if
  you also tag properly in Instagram's *Tag People* field every sponsor gets tagged twice.
  So the caption stays clean and the handles + location come back on a **before you share**
  checklist for Instagram's own fields. Location is always a plain lake name, never an ID
  (Meta hard-rejects those).
- **Installs like an app** — home-screen icon named *Captions*, standalone display,
  offline shell.
- **Dead signal doesn't lose the work** — a network-failed analyze queues the photos in
  `localStorage` and offers *Finish this draft* on the next open or when coverage returns.
- **One-tap out** — *Share photo + caption* puts the full-quality originals into the
  native share sheet with the caption already on the clipboard (iOS silently drops share
  text, so the clipboard is the plan, not a fallback).

---

## How it works

```
browser                        Google Apps Script                Anthropic
app/index.html  ──POST──▶  backend/Code.gs           ──x-api-key──▶  claude-sonnet-4-6
                {_token,        (key + token live in
                 messages}       Script Properties)
```

The browser never talks to `api.anthropic.com` and never holds the key. Same proven shape
as **baxstar-pontoon** — reuse its `Code.gs`, mock server, and runbook rather than
inventing a new proxy.

**Two hard rules:**

1. The `sk-ant-` key lives **only** in Apps Script Script Properties. Never in this repo,
   never in any HTML, never in any committed file.
2. Never call `api.anthropic.com` from the browser. The rejected client-side-key build is
   documented in `/reference` for history — do not build on it.

`PROXY_URL` and `PROXY_TOKEN` *are* committed in `app/index.html`, on purpose. The token is
a soft gate, not a secret — anyone can read it in view-source. The real protection is that
`Code.gs` fixes the model and `max_tokens` server-side, capping abuse cost. Shipped as-is
2026-07-02; see the security-model section of `DEPLOY.md`.

---

## Repo map

| Path | What it is |
|---|---|
| `index.html` | Landing page served at the Pages root |
| `app/index.html` | **The tool.** Single file — markup, CSS, and all app JS |
| `app/content360/` | Content360 handoff pilot; embeds the tool in an iframe, does not fork it |
| `app/manifest.webmanifest`, `app/sw.js`, `app/icons/` | PWA install + offline shell |
| `backend/Code.gs` | Apps Script proxy. Holds the key, injects model + `max_tokens` |
| `.devtest/` | Test harnesses and the mock proxy — no key, no billed calls |
| `.github/workflows/` | CI: Content360 bridge contract checks |
| `reference/` | The dead-end client-side-key architecture. History only |

---

## Tests

Three harnesses. None needs an `sk-ant-` key, none makes a billed call, none touches the
deploy.

```bash
# Content360 bridge contract — 12 static checks, no dependencies
node .devtest/content360-bridge-static.mjs

# assemble() discipline + sponsor parity — 2 checks
npm install --no-save jsdom && node .devtest/assemble-and-sponsors.mjs

# Full app flow in headless Chromium with the proxy intercepted — 35 assertions
npm install --no-save playwright && npx playwright install chromium
node .devtest/app-e2e.mjs
```

`app-e2e.mjs` covers the whole path: zero CORS preflights, the 5-hashtag cap in both modes,
chip toggles in both directions, no `@` anywhere in the clipboard text, PWA manifest and
service worker, share sheet, camera intake, and the full offline-queue round trip.

`assemble-and-sponsors.mjs` checks the sponsor list against the live
`baxstarcode/baxstar-ember` source, and falls back to the pinned copy in
`.devtest/canonical-sponsors.json` when that repo isn't reachable. The fallback is a
snapshot, not a live check, and it says so when it uses one.

`.devtest/mock_gas_server.py` mirrors the `Code.gs` contract (same validation order, same
error strings, same CORS behavior) for manual bench runs.

Verification is proportional — a one-line fix doesn't need the full suite; anything that
ships or touches behavior does.

---

## Sponsors — always check both sides

The same 10 sponsors live in two places, and they have drifted before:

- `MENTIONS` in `app/index.html`
- `SPONSORS` in [`baxstarcode/baxstar-ember`](https://github.com/baxstarcode/baxstar-ember) → `src/baxstar-ember.jsx`

| Sponsor | Handle(s) |
|---|---|
| Vexus boat | `@therealvexusboats` |
| Vexus on clothing | `@therealvexus` |
| Mercury motor | `@mercurymarine` |
| Power-Pole anchors | `@power.pole` |
| Striker gear | `@strikerbrands` |
| Eternal Lithium | `@eternallithium` |
| Sunglasses (iGOGS) | `@igogs` |
| Summit Fishing | `@summitfishingequipment` |
| J&K Marine | `@jandkmarine` *(manual toggle — not detectable in a photo)* |
| Detroit Lake | `@dlchamber`, `@detroitlakesminnesota` |

Ember once tagged `@vexusboats` — a **different company**, notified on every sponsored
post. Two front doors is deliberate (this is the one-tap URL at the lake, Ember is the
command center), so drift is the standing cost and the sponsor list is the first thing to
check whenever either side changes. `assemble-and-sponsors.mjs` catches it.

---

## The rest of the docs

| File | Owns |
|---|---|
| `CLAUDE.md` | Repo rules for agents — locked decisions, doc discipline, preflight |
| `BUILD_STATE.md` | Build log and source of truth for progress. Run `/caption` for one increment |
| `DEPLOY.md` | One-time Apps Script + Pages setup, the redeploy gotcha, troubleshooting table |
| `CONTENT360_BRIDGE.md` | Pilot scope, what's out of scope, acceptance criteria |
| `.claude/commands/caption.md` | The `/caption` build-increment command |

Read `BUILD_STATE.md` and `CLAUDE.md` before any build-related change. Steps tagged
`[BRADY]` are his — never touch them. Write complete files, never snippets.
