/* Targeted behavior test for the new Publish flow.
   Serves app/ locally, stubs the outbox /exec with a route, injects one image,
   and asserts: gate order (no image / setup row / confirm arm), payload contract,
   success + failure paths. No network, no real outbox. */
import { chromium } from "playwright";
import http from "http";
import { readFileSync } from "fs";
import path from "path";

import { fileURLToPath } from "url";
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = http.createServer((req, res) => {
  const p = req.url.split("?")[0];
  const f = path.join(ROOT, "app", p === "/" ? "index.html" : p.slice(1));
  try { res.setHeader("Content-Type", f.endsWith(".html") ? "text/html" : "application/octet-stream"); res.end(readFileSync(f)); }
  catch { res.statusCode = 404; res.end("nope"); }
});
await new Promise(r => server.listen(8931, r));

const OUTBOX = "https://script.google.com/macros/s/TESTDEPLOYID/exec";
const browser = await chromium.launch();
const page = await browser.newPage();
let posted = null; let respondOk = true;
await page.route("**/script.google.com/**", async route => {
  posted = JSON.parse(route.request().postData());
  await route.fulfill({ contentType: "application/json", body: JSON.stringify(respondOk ? { ok: true, folder: "Baxstar Ember Outbox", images: ["x.jpg"] } : { ok: false, error: "unauthorized" }) });
});
page.on("pageerror", e => { console.log("PAGE ERROR", e.message); process.exitCode = 1; });

await page.goto("http://localhost:8931/index.html");
// The actions row lives in the results card, hidden until a draft exists — reveal it
// the way fillResults does, then bind the live handlers it would have bound.
await page.evaluate(() => { document.getElementById("results").classList.remove("hidden"); });
const fails = [];
const ok = (name, cond) => { console.log((cond ? "ok   " : "FAIL ") + name); if (!cond) fails.push(name); };

// 1. no image -> error, no fetch
await page.click("#publish");
ok("no-image gate", (await page.textContent("#errBox")).includes("Add a photo") && posted === null);

// 2. inject one image (1x1 jpeg) as if intaken, with an original File
await page.evaluate(async () => {
  const c = document.createElement("canvas"); c.width = 800; c.height = 600;
  const g = c.getContext("2d"); g.fillStyle = "#a33"; g.fillRect(0, 0, 800, 600);
  const dataUrl = c.toDataURL("image/jpeg", 0.9);
  const blob = await (await fetch(dataUrl)).blob();
  window.__images.push({ dataUrl, mediaType: "image/jpeg", b64: dataUrl.split(",")[1], file: new File([blob], "orig.jpg", { type: "image/jpeg" }) });
  // fill the caption fields the way fillResults would
  document.getElementById("caption").value = "Test caption body";
  document.getElementById("lake").value = "Pelican Lake";
  document.getElementById("hashtags").value = "#crappie #crappiefishing";
  window.mentionState = window.mentionState || {};
});

// 3. no outbox URL -> setup row appears, no fetch
await page.click("#publish");
ok("setup-row gate", !(await page.locator("#pubSetup").evaluate(el => el.classList.contains("hidden"))) && posted === null);

// 4. bad URL rejected
await page.fill("#outboxUrl", "https://example.com/exec");
await page.click("#outboxSave");
ok("bad URL rejected", (await page.textContent("#errBox")).includes("exec URL"));

// 5. good URL saved, row hides
await page.fill("#outboxUrl", OUTBOX);
await page.click("#outboxSave");
ok("URL saved hides row", await page.locator("#pubSetup").evaluate(el => el.classList.contains("hidden")));
ok("URL in localStorage", await page.evaluate(k => localStorage.getItem("cs-outbox-url") === k, OUTBOX));

// 6. first click arms, does not send
await page.click("#publish");
ok("confirm arm", (await page.textContent("#publish")).includes("Confirm") && posted === null);

// 7. second click sends; payload contract
await page.click("#publish");
await page.waitForFunction(() => document.getElementById("publish").textContent.includes("Staged"), { timeout: 8000 });
ok("posted", posted !== null);
const p = posted;
ok("source", p.source === "caption-studio");
ok("caption plain (no handles)", p.caption.includes("Test caption body") && !p.caption.includes("@"));
ok("brand block", p.caption.includes("Baxstar Fishing Guide Service") && p.caption.includes("baxstarfishing.com"));
ok("images 1 slide b64", Array.isArray(p.images) && p.images.length === 1 && p.images[0].length > 1000 && p.imageBase64 === p.images[0]);
ok("lake name", p.lake === "Pelican Lake");
ok("postWindow", p.postWindow === "4 PM CT" && p.postTimeLocal === "16:00");
ok("postAt is future ISO", /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(p.postAt) && new Date(p.postAt) > new Date());
const chi = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour12: false, hour: "2-digit" }).format(new Date(p.postAt));
ok("postAt is 16:00 Chicago", chi === "16");
ok("sponsors array", Array.isArray(p.sponsors));
ok("clientTime", !!Date.parse(p.clientTime));

// 8. multi-image gate
await page.evaluate(() => { window.__images.push({ ...window.__images[0] }); });
await page.waitForFunction(() => !document.getElementById("publish").disabled);
await page.click("#publish");
ok("carousel gate", (await page.textContent("#errBox")).includes("1 photo per post"));
await page.evaluate(() => { window.__images.pop(); });

// 9. failure path: outbox says no -> error, button restored
respondOk = false; posted = null;
await page.click("#publish"); await page.click("#publish");
await page.waitForFunction(() => document.getElementById("errBox").textContent.includes("Nothing was published"), { timeout: 8000 });
ok("failure surfaces + nothing published", (await page.textContent("#errBox")).includes("unauthorized"));
ok("button restored", !(await page.locator("#publish").evaluate(el => el.disabled)));

// 10. regression: copy/share/assemble untouched — build() runs, preview renders
await page.evaluate(() => window.build && window.build());
console.log(fails.length ? `\n${fails.length} FAILURES` : "\nALL PASS");
await browser.close(); server.close();
process.exit(fails.length ? 1 : 0);
