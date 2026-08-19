/**
 * Caption Studio browser test — run with: node .devtest/app-e2e.mjs
 *
 * Drives the REAL app/index.html in headless Chromium with the proxy intercepted, so no
 * sk-ant- key is used, no Anthropic call is billed, and no deploy is involved. The
 * interception mirrors mock_gas_server.py's contract: the response is Anthropic-shaped
 * and its single text block is the detection JSON the page parses.
 *
 * Needs a browser, so playwright is installed on demand rather than vendored:
 *   npm install --no-save playwright && npx playwright install chromium
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const results = [];
const check = (name, ok, detail) => results.push([name, !!ok, detail || ""]);

const PROXY = (fs.readFileSync(path.join(ROOT, "app/index.html"), "utf8")
  .match(/const PROXY_URL *= *"([^"]+)"/) || [])[1];
if (!PROXY) throw new Error("no PROXY_URL found in app/index.html");

/* --- serve the repo on a real origin -------------------------------------- */
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || "/").split("?")[0]);
  const file = path.join(ROOT, rel === "/" ? "index.html" : rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("no");
    return;
  }
  const type = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[path.extname(file)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type }).end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const DETECTION = {
  species: ["smallmouth bass"],
  isBassPost: true,
  vexusBoat: true,
  mercuryMotor: true,
  powerPole: false,
  vexusLogo: false,
  striker: false,
  eternalLithium: false,
  sunglasses: true,
  summit: true,
  detroitLake: true,
  lakeGuess: "Detroit Lake",
  captionDraft: "Cold front pushed them tight to the rocks. We found them anyway.",
  notes: "",
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();

let proxyBody = null;
let preflights = 0;

await page.route(`${PROXY}**`, async (route) => {
  const req = route.request();
  if (req.method() === "OPTIONS") { preflights++; }
  proxyBody = JSON.parse(req.postData() || "{}");
  await route.fulfill({
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    contentType: "application/json",
    body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(DETECTION) }] }),
  });
});

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

await page.goto(`${ORIGIN}/app/index.html`, { waitUntil: "load" });

const jpeg = async (w, h, hue) => Buffer.from(await page.evaluate(async ([w, h, hue]) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = `hsl(${hue},70%,50%)`;
  g.fillRect(0, 0, w, h);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.95));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}, [w, h, hue]));

await page.setInputFiles("#file", [
  { name: "a.jpg", mimeType: "image/jpeg", buffer: await jpeg(1800, 1200, 20) },
  { name: "b.jpg", mimeType: "image/jpeg", buffer: await jpeg(1200, 1600, 200) },
]);

await page.locator("#analyze").click();
await page.waitForSelector("#results:not(.hidden)", { timeout: 20000 });

check("proxy call is CORS-simple — zero preflights", preflights === 0, String(preflights));
check("both photos went to the model in one read",
  proxyBody.messages[0].content.filter((c) => c.type === "image").length === 2);
check("only {_token, messages} is posted — no key, no extras",
  Object.keys(proxyBody).sort().join(",") === "_token,messages", Object.keys(proxyBody).join(","));

const chipText = await page.locator("#chips").innerText();
check("Summit Fishing chip exists", /Summit Fishing/.test(chipText), chipText);
check("J&K Marine chip exists", /J&K Marine/.test(chipText), chipText);
check("all ten sponsor chips render", (await page.locator("#chips .chip").count()) === 10,
  String(await page.locator("#chips .chip").count()));

const onChips = await page.locator("#chips .chip.on").allInnerTexts();
check("detected sponsors are pre-armed, including the new Summit key",
  onChips.some((t) => /Vexus boat/.test(t)) && onChips.some((t) => /Summit Fishing/.test(t)),
  onChips.join(" | "));
check("J&K Marine starts off — it has no detection key",
  !onChips.some((t) => /J&K Marine/.test(t)), onChips.join(" | "));
check("Power-Pole stays off when undetected", !onChips.some((t) => /Power-Pole/.test(t)));

check("canonical Vexus handle is the one shown",
  /@therealvexusboats/.test(chipText) && !/@vexusboats\b/.test(chipText.replace(/@therealvexusboats/g, "")));

/* Toggle J&K on. Its handle belongs in the composer checklist — the list of what to
   type into Instagram's own Tag People field — and NOT in the caption preview, where an
   @ notifies nobody and double-tags anyone also tagged properly. */
await page.locator('#chips .chip:has-text("J&K Marine")').click();
check("toggling J&K on adds its handle to the composer checklist",
  /@jandkmarine/.test(await page.locator("#cHandles").innerText()));
check("handles stay out of the caption preview",
  !/@/.test(await page.locator("#preview").innerText()),
  await page.locator("#preview").innerText());

/* Hashtag cap — the bass tag takes a slot, so 5 total with extras reported. */
await page.fill("#hashtags", "#a #b #c #d #e #f #g");
await page.locator("#hashtags").dispatchEvent("input");
const count = await page.locator("#tagCount").innerText();
// innerText comes back CSS-uppercased, so match case-insensitively.
check("hashtag cap holds at 5 with the trim reported", /5\/5 hashtags · \d+ extra trimmed/i.test(count), count);

await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ORIGIN });
await page.locator("#copy").click();
const clip = await page.evaluate(() => navigator.clipboard.readText());
check("copied text carries exactly 5 hashtags", (clip.match(/#[\w]+/g) || []).length === 5,
  (clip.match(/#[\w]+/g) || []).join(" "));
check("copied text includes the bass tag on a bass post", clip.includes("#getyourbassingear"));
check("copied text carries no @handles at all",
  !/@/.test(clip), clip);

/* Brady's placement rule: on a bass post the tag sits directly above the business name,
   with a blank line above it, so the brand block reads as one unit. */
const clipLines = clip.split("\n");
const bassIdx = clipLines.indexOf("#getyourbassingear");
check("bass tag sits immediately above the business name",
  bassIdx >= 0 && clipLines[bassIdx + 1] === "Baxstar Fishing Guide Service",
  JSON.stringify(clipLines));
check("a blank line separates the caption body from the bass tag",
  bassIdx > 0 && clipLines[bassIdx - 1] === "", JSON.stringify(clipLines));

/* The lake belongs in Instagram's Location field as a plain name — never an ID, which
   Meta hard-rejects — and never in the caption text. */
const lakeShown = await page.locator("#cLake").innerText();
check("location checklist shows a plain lake name, not an ID",
  lakeShown.trim().length > 0 && !/^\d+$/.test(lakeShown.trim()), lakeShown);
check("the lake is not pasted into the caption", !clip.includes(lakeShown.trim()), clip);

/* A look at the finished card, for eyeballing the brand-block spacing and the checklist. */
await page.locator(".preview").locator("xpath=ancestor::div[@class='card']")
  .screenshot({ path: path.join(ROOT, ".devtest/shot_ready.png") });

/* Turning Bass off drops the tag entirely — it is a bass-post-only tag. The checkbox is
   display:none behind its styled switch, so flip it directly rather than clicking. */
await page.evaluate(() => {
  const b = document.getElementById("bass");
  b.checked = false;
  b.dispatchEvent(new Event("change"));
});
await page.locator("#copy").click();
const clipNoBass = await page.evaluate(() => navigator.clipboard.readText());
check("bass tag disappears on a non-bass post", !clipNoBass.includes("#getyourbassingear"), clipNoBass);
check("brand block still leads with the business name without the bass tag",
  clipNoBass.split("\n").includes("Baxstar Fishing Guide Service"), clipNoBass);

/* PWA installability: the three files an install prompt needs must exist and agree.
   The SW itself is exercised by the browser only over https or localhost; here we
   assert the contract (files served, manifest sane, registration wired) without
   waiting on worker lifecycle. */
const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return { err: "no manifest link" };
  const res = await fetch(link.href);
  if (!res.ok) return { err: "manifest " + res.status };
  return { json: await res.json() };
});
check("manifest is linked, served, and standalone with icons",
  !manifest.err && manifest.json.display === "standalone" && (manifest.json.icons || []).length >= 3,
  JSON.stringify(manifest).slice(0, 120));
const pwaBits = await page.evaluate(async () => ({
  sw: (await fetch("sw.js")).ok,
  icon: (await fetch("icons/icon-192.png")).ok,
  apple: !!document.querySelector('link[rel="apple-touch-icon"]'),
  theme: !!document.querySelector('meta[name="theme-color"]'),
  reg: !!navigator.serviceWorker,
}));
check("sw.js and icons are served, apple-touch + theme-color present",
  pwaBits.sw && pwaBits.icon && pwaBits.apple && pwaBits.theme, JSON.stringify(pwaBits));

/* Outbound share: stub the share sheet, click the button, assert the payload.
   The two photos uploaded earlier must arrive as FILES (originals retained by the
   intake), the caption must ride as text, and the clipboard must already hold the
   caption before the sheet opens — iOS drops share text, the clipboard is the plan. */
const shareResult = await page.evaluate(async () => {
  window.__shares = [];
  navigator.canShare = () => true;
  navigator.share = (d) => { window.__shares.push({
    files: (d.files || []).length,
    allFiles: (d.files || []).every((f) => f instanceof File && f.size > 0),
    hasText: typeof d.text === "string" && d.text.length > 0,
  }); return Promise.resolve(); };
  document.getElementById("share").click();
  await new Promise((r) => setTimeout(r, 120));
  return {
    calls: window.__shares,
    clip: await navigator.clipboard.readText(),
    keptOriginals: window.__images.every((im) => im.file instanceof File || typeof im.b64 === "string"),
    label: document.getElementById("share").textContent,
  };
});
check("share sends the photos as real files with the caption as text",
  shareResult.calls.length === 1 && shareResult.calls[0].files === 2 && shareResult.calls[0].allFiles && shareResult.calls[0].hasText,
  JSON.stringify(shareResult.calls));
check("caption is on the clipboard before the sheet opens",
  shareResult.clip.length > 0 && !shareResult.clip.includes("@"), shareResult.clip.slice(0, 80));
check("intake keeps a shareable file per photo", shareResult.keptOriginals, "");
check("share button confirms and points at the clipboard", /clipboard/i.test(shareResult.label), shareResult.label);

/* Camera path: a dedicated capture input that opens the rear camera on a phone and
   feeds the exact same intake as the picker — thumbs grow, original File retained. */
const beforeCam = await page.evaluate(() => window.__images.length);
const camAttrs = await page.evaluate(() => {
  const c = document.getElementById("camera");
  return c && { capture: c.getAttribute("capture"), accept: c.getAttribute("accept") };
});
check("camera input opens the rear camera", camAttrs && camAttrs.capture === "environment" && /image/.test(camAttrs.accept), JSON.stringify(camAttrs));
await page.setInputFiles("#camera", [{ name: "snap.jpg", mimeType: "image/jpeg", buffer: await jpeg(1600, 1200, 120) }]);
await page.waitForFunction((n) => window.__images.length === n + 1, beforeCam);
const camEntry = await page.evaluate(() => {
  const im = window.__images[window.__images.length - 1];
  return { hasFile: im.file instanceof File, thumbs: document.querySelectorAll("#thumbs img, #thumbs .thumb").length };
});
check("camera shot lands in the same intake with its original retained",
  camEntry.hasFile && camEntry.thumbs >= 3, JSON.stringify(camEntry));
const touch = await page.evaluate(() => ({
  ta: getComputedStyle(document.getElementById("analyze")).touchAction,
  safe: Array.from(document.styleSheets).some((ss) => { try { return Array.from(ss.cssRules).some((r) => /safe-area-inset/.test(r.cssText)); } catch { return false; } }),
}));
check("touch-action manipulation on controls, safe-area padding in the sheet",
  touch.ta === "manipulation" && touch.safe, JSON.stringify(touch));

/* Offline queue, full round trip: kill the signal, analyze queues the draft;
   reopen with coverage, one tap finishes it against the mock. The abort route
   stacks on top of the mock and unrouting restores it. */
const abortRoute = (route) => route.abort("internetdisconnected");
await page.route(`${PROXY}**`, abortRoute);
await page.locator("#analyze").click();
await page.waitForFunction(() => !!localStorage.getItem("cs-queued-draft"));
const queued = await page.evaluate(() => ({
  q: JSON.parse(localStorage.getItem("cs-queued-draft")),
  msg: document.getElementById("errBox").textContent,
}));
check("dead signal queues the draft instead of losing it",
  queued.q.photos.length === 3 && queued.q.photos.every((p) => p.b64.length > 100) && /saved/i.test(queued.msg),
  `${queued.q.photos.length} photos | ${queued.msg.slice(0, 60)}`);
// Unroute ONLY the abort handler — a bare unroute(pattern) would also remove
// the mock underneath it and send the finish step to the real proxy.
await page.unroute(`${PROXY}**`, abortRoute);

await page.reload({ waitUntil: "load" });
await page.waitForSelector("#queueBar:not(.hidden)");
const offer = await page.evaluate(() => document.getElementById("queueInfo").textContent);
check("next open offers the lake draft", /3 photos saved/.test(offer), offer);
await page.locator("#queueGo").click();
await page.waitForSelector("#results:not(.hidden)", { timeout: 20000 });
const finished = await page.evaluate(() => ({
  cleared: !localStorage.getItem("cs-queued-draft"),
  thumbs: window.__images.length,
  caption: document.getElementById("caption") ? document.getElementById("caption").value.length : document.getElementById("preview").textContent.length,
  barHidden: document.getElementById("queueBar").classList.contains("hidden"),
}));
check("one tap finishes the draft and clears the queue",
  finished.cleared && finished.thumbs === 3 && finished.caption > 0 && finished.barHidden,
  JSON.stringify(finished));

check("no uncaught page errors", pageErrors.length === 0, pageErrors.join(" | "));

await browser.close();
server.close();

let failed = 0;
for (const [name, ok, detail] of results) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? `\n      (${detail})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
