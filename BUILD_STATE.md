BAXSTAR CAPTION STUDIO — BUILD STATE (proxy architecture; decided 2026-06-28)
Frontend: GitHub Pages serving index.html. Backend: Apps Script Code.gs proxy holding the key. Pattern mirrors baxstar-pontoon.

[x] 1. Repo set up: index.html (proxy frontend) + .gitignore + CLAUDE.md + this file, committed. — Done 2026-06-28: scaffolded at ~/Desktop/caption-studio; index.html = proxy file; dead-end pair → /reference; .claude/commands/caption.md added; first commit pushed to baxstarcode/caption-studio.
[x] 2. backend/Code.gs written: doPost; read token + Anthropic key from Script Properties; validate incoming {_token}; relay {messages} to https://api.anthropic.com/v1/messages with headers x-api-key, anthropic-version: 2023-06-01, content-type: application/json (NOT the browser-only dangerous-direct header); inject model "claude-sonnet-4-6" and max_tokens 1000 server-side; return Anthropic's raw JSON unchanged. Mirror baxstar-pontoon/Code.gs. — Done 2026-06-28: doPost validates {_token} against BAXSTAR_TOKEN + relays {messages} to claude-sonnet-4-6 with key from Script Properties (both secrets in Script Properties only); model + max_tokens injected server-side; raw Anthropic JSON passed through; added doGet sanity endpoint + setupCheck helper.
[ ] 3. Local mock proxy written (mirror baxstar-pontoon's .devtest/mock_gas_server.py) so the frontend-to-proxy contract runs without the real key or a deploy.
[ ] 4. Frontend hardened: posts ONLY {_token, messages} to PROXY_URL; handles data.error; sponsor chips toggle; hashtag count caps at 5; copy button works. Leave PROXY_URL and token as clearly-marked placeholders.
[ ] 5. DEPLOY.md runbook: create Apps Script project, paste Code.gs, set Script Properties (token + Anthropic key), deploy as web app (Execute as Brady, Access: Anyone), copy the /macros/s/.../exec URL, paste exec URL + token into index.html, enable Pages. Note: use the /macros/s/ exec URL, NOT a /macros/a/<domain>/ URL (login wall).
[BRADY] 6. Provide an sk-ant- key; set Script Properties; deploy the web app; paste exec URL + token into index.html; enable Pages.
[ ] 7. End-to-end verify on the live Pages URL with a real fishing photo: caption returns, sponsor chips toggle, hashtags cap at 5, copy works. Not done off a 200 alone. Record VERIFIED + live URL here.
[HOLD] 8. v2 merge plan only (do not build): preset/look catalog, social post builder, video-frame capture. Ship the caption tool first.

OPEN QUESTIONS FOR BRADY:
(none yet)
