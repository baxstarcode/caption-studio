# Deploying Baxstar Caption Studio

Frontend: `index.html` on **GitHub Pages**. Backend: `backend/Code.gs` as a
**Google Apps Script web app** that holds the Anthropic key. Same proven shape
as baxstar-pontoon.

> **Non-negotiable:** the Anthropic key lives ONLY in Apps Script **Script
> Properties** — never in this repo, never in `index.html`, never in any
> committed file. `index.html` gets the **exec URL** and the **token** only.

You do this once. Budget ~15 minutes. Steps marked **▶** happen in the Apps
Script editor; the rest in your browser / GitHub.

---

## Before you start — have these ready

- An **`sk-ant-` API key** (console.anthropic.com → API keys).
- A **shared token** you invent — any long random string. It gates the proxy
  and must match in two places (Script Properties **and** `index.html`).
  Generate one in Terminal if you like:
  ```
  openssl rand -hex 16
  ```
  Example shape: `9f3c1a...` (32 hex chars). Call this **`<TOKEN>`** below.

---

## Part A — Stand up the Apps Script proxy

**1. New project.** Go to <https://script.google.com> → **New project**.
Name it `baxstar-caption-proxy`.

**2. Paste the code.** Delete the default `function myFunction(){}` and paste
the **entire** contents of `backend/Code.gs` from this repo. Save (⌘S).

**3. Set the two secrets.** Project **Settings** (gear, left rail) → scroll to
**Script Properties** → **Add script property**, twice:

| Property            | Value                    |
|---------------------|--------------------------|
| `BAXSTAR_TOKEN`     | your `<TOKEN>`           |
| `ANTHROPIC_API_KEY` | your `sk-ant-...` key     |

Save. These names are exact — `Code.gs` reads them verbatim.

**4. ▶ Authorize + confirm.** Back in the editor, pick **`setupCheck`** in the
function dropdown and click **Run**. First run shows a Google consent screen
(it's your own script): **Advanced → Go to baxstar-caption-proxy (unsafe) →
Allow**. Then open **Execution log** — it should read:
```
BAXSTAR_TOKEN set: true
ANTHROPIC_API_KEY set: true
Model: claude-sonnet-4-6 · max_tokens: 1000
```
(It never prints the values — only whether they're present.) If either says
`false`, fix the property in step 3 and re-run.

**5. Deploy as a web app.** **Deploy → New deployment** → gear → **Web app**.
Set:

- **Description:** `caption proxy v1`
- **Execute as:** **Me (your address)**
- **Who has access:** **Anyone**  ← *not* "Anyone with Google account"

Click **Deploy**, authorize if prompted, then **copy the Web app URL**.

> ### ⚠️ The URL must be the `/macros/s/` form
> A correct URL looks like:
> ```
> https://script.google.com/macros/s/AKfy.../exec
> ```
> If you instead get a **`/macros/a/<your-domain>/...`** URL, you deployed
> under a Workspace domain — it throws up a **Google login wall** and the
> public Pages site can't reach it. Fix: redeploy with **Who has access:
> Anyone** (not "Anyone within <domain>"). Same trap as pontoon.

**6. Sanity-check the exec URL.** Paste the `/exec` URL into a browser. You
should see JSON, not a login page:
```json
{ "ok": true, "service": "baxstar-caption-studio-proxy", "model": "claude-sonnet-4-6",
  "note": "POST { _token, messages } to use the proxy." }
```
A login page here = wrong access setting or an `/a/` URL → back to step 5.

---

## Part B — Wire the frontend to the proxy

**7. Edit `index.html`** (top of the `<script>` block). Replace the two
clearly-marked placeholders — these are the **only** edits the frontend needs:

```js
const PROXY_URL   = "PASTE_PROXY_EXEC_URL_HERE";   // → your /macros/s/.../exec URL
const PROXY_TOKEN = "PASTE_TOKEN_HERE";            // → the same <TOKEN> as BAXSTAR_TOKEN
```

`PROXY_TOKEN` must equal `BAXSTAR_TOKEN` exactly. Commit and push `index.html`.
(The fetch already sends `Content-Type: text/plain` so the browser sends no
CORS preflight — leave that as-is.)

---

## Part C — Publish on GitHub Pages

**8. Enable Pages.** Repo **Settings → Pages** → **Source: Deploy from a
branch** → Branch **`main`** / **`/ (root)`** → **Save**. Wait ~1 minute for
the live URL (`https://baxstarcode.github.io/caption-studio/`).

---

## Part D — Verify live (build step 7)

On the live Pages URL, with a real fishing photo: a caption comes back, sponsor
chips toggle, hashtags cap at 5, copy works. A `200` alone isn't "done" — see
build step 7.

---

## Updating the proxy later (important gotcha)

Editing `Code.gs` does **not** change what the live `/exec` serves. To ship a
change: **Deploy → Manage deployments →** edit the existing deployment (pencil)
**→ Version: New version → Deploy**. The `/exec` URL stays the same. (Creating a
*new deployment* instead would mint a *new* URL you'd have to re-paste.)

---

## Security model — the honest limits

- **The key is safe:** it never leaves Script Properties; `Code.gs` fixes the
  model and `max_tokens` server-side, so the browser can't change them.
- **The token is NOT a secret.** It ships inside the public `index.html`, so
  anyone who views source can read it and call your proxy. It's a *soft gate*
  that stops casual drive-by use, nothing more. The real protection is the
  bounded server-side call (one model, `max_tokens` 1000) capping abuse cost.
- If abuse ever shows up, mitigation lives in `Code.gs` (e.g. a per-day call
  cap, or a referer check) — not in the frontend. See the open question in
  `BUILD_STATE.md`.

---

## Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| `/exec` shows a Google **login page** | `/macros/a/` URL or access ≠ "Anyone" → redeploy (step 5) |
| Frontend error: **"Proxy not configured…"** | `BAXSTAR_TOKEN` or `ANTHROPIC_API_KEY` missing → step 3, re-run `setupCheck` |
| Frontend error: **"Bad or missing token"** | `PROXY_TOKEN` in `index.html` ≠ `BAXSTAR_TOKEN` → step 7 |
| Error mentioning **authentication / 401** | bad/expired `sk-ant-` key → replace in Script Properties |
| Caption flow hangs / network error in console | check the `/exec` URL is the one pasted into `PROXY_URL`; re-run the sanity check (step 6) |
| Changed `Code.gs` but behavior is stale | you didn't ship a **New version** → see "Updating the proxy later" |
