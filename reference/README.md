# /reference — do NOT build on these

These are the **dead-end** caption-studio files. They call `api.anthropic.com` directly
from the browser with a client-side key (and missing required headers). That architecture
was rejected — see `../CLAUDE.md` (locked 2026-06-28). Kept for history only.

- `baxstar-caption-studio.html` — original (June 13)
- `caption-studio-found.html` — identical copy (same md5)

(Both files were removed from the working tree in the Step-2 cleanup; recover them from
git history if ever needed.)

The live build uses the **proxy** architecture; the proxy frontend is `../app/index.html`
(the tool — `../index.html` at the root is the landing page as of 2026-07-06).
