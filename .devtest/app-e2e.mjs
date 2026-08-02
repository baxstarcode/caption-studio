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

/* Toggle J&K on and confirm its handle reaches the preview. */
await page.locator('#chips .chip:has-text("J&K Marine")').click();
check("toggling J&K on adds its handle to the preview",
  /@jandkmarine/.test(await page.locator("#preview").innerText()));

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
check("copied text includes the locked bass tag", clip.includes("#getyourbassingear"));
check("copied text includes both Summit and J&K handles",
  clip.includes("@summitfishingequipment") && clip.includes("@jandkmarine"), clip);

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
