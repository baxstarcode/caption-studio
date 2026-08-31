import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

(async function(){
  const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const appPath = path.join(ROOT, "app/index.html");
  const app = fs.readFileSync(appPath, "utf8");

  // --- Spin up the app HTML in jsdom so we can call assemble() ---
  const dom = new JSDOM(app, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true });
  const { window } = dom;

  // Wait for scripts to run and bindings to settle
  await new Promise((res) => {
    if (window.document.readyState === "complete") return res();
    window.addEventListener("load", () => setTimeout(res, 0));
  });

  // app/index.html declares MENTIONS and mentionState with const/let at the top level of a
  // classic <script>. Those bindings live in the script's global LEXICAL scope, which is NOT
  // the same as the window object — window.MENTIONS is undefined and always will be. Reach
  // them through window.eval, which runs in that scope. (Reading them off window silently
  // skipped every assertion in this file.)
  const ev = (expr) => window.eval(expr);
  const MENTIONS = ev("typeof MENTIONS !== 'undefined' ? MENTIONS : null");

  const failures = [];

  // Test A: assemble() must not inject any confirmed @handles or the lake value into text
  try{
    if (typeof window.assemble !== "function") throw new Error("assemble() not found in app/index.html");

    // Set up a caption that contains an @ to ensure user-typed @ is not what we're asserting against.
    const captionEl = window.document.getElementById("caption");
    const lakeEl = window.document.getElementById("lake");
    const hashtagsEl = window.document.getElementById("hashtags");
    if (!captionEl || !lakeEl) throw new Error("caption or lake input missing in DOM");

    captionEl.value = "Caught a beast! @typeduser should not be injected programmatically.";
    const pinnedLake = "Detroit Lake";
    lakeEl.value = pinnedLake;
    hashtagsEl.value = "#test";

    if (!Array.isArray(MENTIONS)) throw new Error("MENTIONS not found or not an array in app/index.html");

    // Turn on every mention to simulate model-detected sponsors (same scope as assemble())
    ev("MENTIONS.forEach(m => { mentionState[m.key] = true; })");

    const out = window.assemble();

    // Ensure none of the MENTIONS handles are present in assembled text
    const handlesFound = [];
    MENTIONS.forEach(m => {
      (m.handles||[]).forEach(h => { if (out.text.includes(h)) handlesFound.push(h); });
    });
    if (handlesFound.length) failures.push(`assemble() included confirmed handles in text: ${handlesFound.join(", ")}`);

    // The handles must still be reported OUT of band, for the composer checklist
    if (!Array.isArray(out.handles) || out.handles.length === 0){
      failures.push("assemble() returned no handles — the Tag People checklist would be empty");
    }

    // Ensure the assembled text does not contain the lake string
    if (pinnedLake && out.text.includes(pinnedLake)) failures.push(`assemble() included the lake string in text: "${pinnedLake}"`);

  }catch(e){ failures.push(`Assemble test failed: ${e.message}`); }

  // Test B: sponsor list parity
  try{
    // Get app handles from the running DOM
    if (!Array.isArray(MENTIONS)) throw new Error("MENTIONS not found or not an array in app/index.html");
    const appHandles = new Set(MENTIONS.flatMap(m => (m.handles||[])));

    // Try to fetch canonical from baxstar-ember
    const canonicalUrl = "https://raw.githubusercontent.com/baxstarcode/baxstar-ember/main/src/baxstar-ember.jsx";
    let canonicalHandles = null;
    let usedPinned = false;
    try{
      const res = await fetch(canonicalUrl, { method: "GET" });
      if (res.ok){
        const text = await res.text();
        // crude extraction: find all @handles in the file and dedupe
        const matches = Array.from((text.match(/@[-_\.\w\d]+/g) || []));
        canonicalHandles = new Set(matches);
      }else{
        // fall back to pinned fixture
        usedPinned = true;
      }
    }catch(e){ usedPinned = true; }

    if (usedPinned){
      // read pinned fixture bundled in this repo
      const fixturePath = path.join(ROOT, ".devtest/canonical-sponsors.json");
      const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
      canonicalHandles = new Set(fixture);
      console.log("NOTE: Could not fetch baxstar-ember canonical list; using pinned fixture from .devtest/canonical-sponsors.json (this is a pinned copy, not a live check).");
    }

    // Compare sets
    const onlyInApp = Array.from(appHandles).filter(x => !canonicalHandles.has(x));
    const onlyInCanonical = Array.from(canonicalHandles).filter(x => !appHandles.has(x));

    if (onlyInApp.length || onlyInCanonical.length){
      failures.push(`Sponsor list divergence:\n  only in app: ${onlyInApp.join(', ') || '(none)'}\n  only in canonical: ${onlyInCanonical.join(', ') || '(none)'}${usedPinned ? '\n(pinned canonical used)' : ''}`);
    }

  }catch(e){ failures.push(`Sponsor parity test failed: ${e.message}`); }

  // Report and exit
  if (failures.length){
    console.error("FAIL\n" + failures.join("\n"));
    process.exit(1);
  }else{
    console.log("PASS  All checks passed: assemble() does not inject confirmed handles or lake into the caption text; sponsor list matches canonical.");
    process.exit(0);
  }

})();
