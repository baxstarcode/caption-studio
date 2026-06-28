"""Mock of the Baxstar Caption Studio Anthropic proxy (backend/Code.gs).

Runs the frontend->proxy contract locally, WITHOUT a real sk-ant- key and
WITHOUT deploying the Apps Script web app. Lets the index.html caption flow
(upload -> "Read photo & draft" -> fill results -> copy) be driven end-to-end
on the bench. Same harness shape as baxstar-pontoon's .devtest/mock_gas_server.py.

WHAT IT MIRRORS
  * The Code.gs contract exactly:
      Request : { "_token": "<token>", "messages": [ ... ] }
      Response: Anthropic-shaped /v1/messages JSON, unchanged.
                Success -> has a `content` array of blocks.
                Any error -> has an `error` field (frontend branches on data.error).
  * Code.gs's validation ORDER and its exact error strings: bad-JSON ->
    missing/bad token -> missing/empty messages -> success. So the frontend's
    error handling is exercised against the real wording, not a paraphrase.
  * GAS CORS behavior (same as the pontoon mock): a POST answers with
    Access-Control-Allow-Origin: * but an OPTIONS preflight gets a 405 with NO
    CORS headers. A cross-origin request that is not CORS-simple therefore fails
    here exactly as it would against the deployed web app -- which is the whole
    point of testing against a faithful mock (it catches a frontend that posts
    a preflight-triggering Content-Type before it ever reaches production).

WHAT IT CANNOT DO
  It has no Anthropic key, so it does NOT call the model. Instead it returns a
  deterministic, Anthropic-shaped success whose single text block is the JSON
  detection object the frontend parses. The default is a believable Detroit
  Lake smallmouth scene; a test page can override it (see TEST AFFORDANCES).

TEST AFFORDANCES (test-only fields the real frontend never sends; the real
proxy ignores unknown fields, so these change nothing in production):
  * "_mockDetection": <object>  -> wrap THIS object as the model's JSON reply,
    so any UI branch (bass vs walleye, sponsors on/off) can be driven.
  * "_mockRaw": <object>        -> return THIS as the raw response body verbatim,
    e.g. {"error":"overloaded"} to exercise the frontend's error path.
  POST /report/<name>           -> save the request body to report_<name>.txt.

Every request is logged to mock_log.jsonl. Bind: 127.0.0.1:8810.
Run:  cd ~/Desktop/caption-studio/.devtest && python3 mock_gas_server.py
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

# Bench token. NOT a secret -- the local test build of index.html sets
# PROXY_TOKEN to this value. The real BAXSTAR_TOKEN lives only in Apps Script
# Script Properties and never appears in this repo.
TOKEN = 'caption-mock-token-2026'
PORT = 8810
MODEL = 'claude-sonnet-4-6'   # the id Code.gs injects server-side
LOG = open('mock_log.jsonl', 'a')

# Default detection: a believable premium Baxstar smallmouth scene. The caption
# obeys the voice rules baked into the frontend prompt -- one earned exclamation,
# never two sentences in a row, no hashtags/prices/emoji.
DEFAULT_DETECTION = {
    "species": ["smallmouth bass"],
    "isBassPost": True,
    "vexusBoat": True,
    "mercuryMotor": False,
    "powerPole": False,
    "vexusLogo": False,
    "striker": True,
    "eternalLithium": False,
    "sunglasses": True,
    "detroitLake": True,
    "lakeGuess": "Detroit Lake",
    "captionDraft": "What a way to open the morning on Detroit Lake! Solid smallmouth, calm water, and a client who earned every bit of that grin.",
    "notes": "Mock detection -- Striker logo read at low confidence."
}


def log(entry):
    LOG.write(json.dumps(entry) + '\n')
    LOG.flush()


def anthropic_message(detection):
    """Wrap a detection object the way Anthropic's /v1/messages would: one
    assistant message whose single text block is the JSON the frontend parses.
    Code.gs returns this body unchanged, so the mock must produce it verbatim."""
    return {
        "id": "msg_mock",
        "type": "message",
        "role": "assistant",
        "model": MODEL,
        "content": [{"type": "text", "text": json.dumps(detection)}],
        "stop_reason": "end_turn",
        "stop_sequence": None,
        "usage": {"input_tokens": 0, "output_tokens": 0}
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _respond(self, code, obj, cors=True):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        if cors:
            self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        # GAS never answers preflight -- refuse, exactly like the deployed app.
        log({'method': 'OPTIONS', 'path': self.path,
             'violation': 'preflight sent -- proxy request is not CORS-simple'})
        self._respond(405, {'error': 'no preflight support'}, cors=False)

    def do_GET(self):
        # Mirrors Code.gs doGet(): a sanity payload, never reveals key state.
        self._respond(200, {
            'ok': True,
            'service': 'baxstar-caption-studio-proxy-mock',
            'model': MODEL,
            'note': 'POST { _token, messages } to use the proxy.'
        })

    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get('Content-Length', 0) or 0))
        ctype = self.headers.get('Content-Type', '')

        # Test pages can stash a report body for later inspection.
        if self.path.startswith('/report/'):
            name = self.path.split('/report/', 1)[1].replace('/', '_') or 'unnamed'
            with open('report_' + name + '.txt', 'wb') as f:
                f.write(raw)
            self._respond(200, {'ok': True})
            return

        # ---- mirror Code.gs validation order + exact error strings ----------
        try:
            body = json.loads(raw)
        except Exception:
            log({'method': 'POST', 'contentType': ctype, 'error': 'body not JSON'})
            self._respond(200, {'error': 'Request body is not valid JSON'})
            return

        if not isinstance(body, dict) or body.get('_token') != TOKEN:
            log({'method': 'POST', 'tokenOk': False})
            self._respond(200, {'error': 'Bad or missing token'})
            return

        msgs = body.get('messages')
        if not isinstance(msgs, list) or not msgs:
            log({'method': 'POST', 'tokenOk': True, 'error': 'missing messages'})
            self._respond(200, {'error': 'Missing or empty messages array'})
            return

        # ---- success: synthesize the Anthropic-shaped reply -----------------
        # Test-only: return an arbitrary raw body verbatim (error-path tests).
        if isinstance(body.get('_mockRaw'), dict):
            log({'method': 'POST', 'tokenOk': True, 'mock': 'raw'})
            self._respond(200, body['_mockRaw'])
            return

        detection = body['_mockDetection'] if isinstance(body.get('_mockDetection'), dict) else DEFAULT_DETECTION
        log({'method': 'POST', 'tokenOk': True, 'messages': len(msgs),
             'mock': 'detection', 'isBassPost': bool(detection.get('isBassPost'))})
        self._respond(200, anthropic_message(detection))


if __name__ == '__main__':
    print('Caption proxy mock on http://127.0.0.1:%d  (bench token: %s)' % (PORT, TOKEN))
    HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
