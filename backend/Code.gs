/**
 * =============================================================================
 * BAXSTAR CAPTION STUDIO — ANTHROPIC PROXY
 * Google Apps Script web app. Receives POSTs from index.html (GitHub Pages)
 * and relays them to the Anthropic Messages API, keeping the API key
 * server-side. Same proven pattern as baxstar-pontoon/Code.gs.
 *
 * WHY A PROXY: the frontend is a public GitHub Pages site. A client-side
 * Anthropic key would be readable by anyone. This proxy holds the key in
 * Script Properties so it never touches the repo or the browser.
 *
 * CONTRACT
 *   Request  (from index.html):  { "_token": "<token>", "messages": [ ... ] }
 *   Response (to index.html):    Anthropic's raw /v1/messages JSON, unchanged.
 *                                On success that JSON has a `content` array;
 *                                on any error it has an `error` field — the
 *                                frontend branches on `data.error`.
 *
 * SECRETS — Script Properties only (never in this file, never in the repo):
 *   BAXSTAR_TOKEN       must match PROXY_TOKEN in index.html
 *   ANTHROPIC_API_KEY   an sk-ant- key (Brady provides at deploy time)
 *
 * Model + max_tokens are injected here, server-side, so the browser can't
 * change them. Full deploy steps live in DEPLOY.md (build step 5).
 * =============================================================================
 */

var CONFIG = {
  ANTHROPIC_URL: 'https://api.anthropic.com/v1/messages',
  ANTHROPIC_VERSION: '2023-06-01',
  MODEL: 'claude-sonnet-4-6',   // current Sonnet 4.6 id — no date suffix
  MAX_TOKENS: 1000
};

/* ---- ENTRY POINT ----------------------------------------------------------
   The frontend POSTs one JSON object: { _token, messages }. We validate the
   token against Script Properties, then relay `messages` to Anthropic with the
   key added server-side, and return Anthropic's response body unchanged. */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e && e.postData && e.postData.contents || '');
  } catch (err) {
    return jsonOut({ error: 'Request body is not valid JSON' });
  }

  var props = PropertiesService.getScriptProperties();
  var expectedToken = props.getProperty('BAXSTAR_TOKEN');
  var apiKey = props.getProperty('ANTHROPIC_API_KEY');

  // Misconfiguration is a server problem, not a client one — say so plainly.
  if (!expectedToken || !apiKey) {
    return jsonOut({
      error: 'Proxy not configured: set BAXSTAR_TOKEN and ANTHROPIC_API_KEY in Script Properties (see DEPLOY.md).'
    });
  }
  if (!body || body._token !== expectedToken) {
    return jsonOut({ error: 'Bad or missing token' });
  }
  if (!body.messages || !Array.isArray(body.messages) || !body.messages.length) {
    return jsonOut({ error: 'Missing or empty messages array' });
  }

  // Model + max_tokens are fixed here so the browser can't override them.
  var payload = {
    model: CONFIG.MODEL,
    max_tokens: CONFIG.MAX_TOKENS,
    messages: body.messages
  };

  try {
    var resp = UrlFetchApp.fetch(CONFIG.ANTHROPIC_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        // NOTE: server-side call — do NOT send the browser-only
        // anthropic-dangerous-direct-browser-access header.
        'x-api-key': apiKey,
        'anthropic-version': CONFIG.ANTHROPIC_VERSION
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true   // pass Anthropic's error body through unchanged
    });
    // Return Anthropic's raw JSON exactly as received (success has `content`,
    // failure has `error` — the frontend handles both).
    return ContentService.createTextOutput(resp.getContentText())
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return jsonOut({ error: 'Proxy fetch failed: ' + String(err && err.message || err) });
  }
}

/* ---- SANITY CHECK ---------------------------------------------------------
   Open the /exec URL in a browser: it should show this JSON. Never reveals
   whether the key is set — only whether the web app is reachable. */
function doGet() {
  return jsonOut({
    ok: true,
    service: 'baxstar-caption-studio-proxy',
    model: CONFIG.MODEL,
    note: 'POST { _token, messages } to use the proxy.'
  });
}

/* ---- SETUP HELPER ---------------------------------------------------------
   Run once from the editor (▶) after pasting Code.gs and setting Script
   Properties. Authorizes UrlFetch and confirms both secrets are present
   WITHOUT logging their values. */
function setupCheck() {
  var props = PropertiesService.getScriptProperties();
  var hasToken = !!props.getProperty('BAXSTAR_TOKEN');
  var hasKey = !!props.getProperty('ANTHROPIC_API_KEY');
  Logger.log('BAXSTAR_TOKEN set: ' + hasToken);
  Logger.log('ANTHROPIC_API_KEY set: ' + hasKey);
  Logger.log('Model: ' + CONFIG.MODEL + ' · max_tokens: ' + CONFIG.MAX_TOKENS);
  if (!hasToken || !hasKey) {
    Logger.log('>> Set the missing property under Project Settings → Script Properties, then re-run.');
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
