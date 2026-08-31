import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bridgePath = path.join(ROOT, "app/content360/index.html");
const appPath = path.join(ROOT, "app/index.html");

const bridge = fs.readFileSync(bridgePath, "utf8");
const app = fs.readFileSync(appPath, "utf8");
const checks = [];
const check = (name, ok) => checks.push([name, Boolean(ok)]);

check("pilot route embeds the existing Caption Studio instead of forking its logic", /<iframe[^>]+src="\.\.\/"/.test(bridge));
check("handoff button exists", /id="open360"[^>]*>Copy \+ open Content360</.test(bridge));
check("Content360 composer URL is the tested Baxstar workspace route", /https:\/\/app\.content360\.io\/os\/b6428c4a-dd4a-4c1e-9e89-b22622111f7a\/posts\/create/.test(bridge));
check("handoff copies Caption Studio's assembled output", /typeof win\.assemble === "function"/.test(bridge) && /copyText\(packet\.text\)/.test(bridge));
check("handoff opens from the user's click to avoid popup blocking", /window\.open\("about:blank", "_blank"\)/.test(bridge));
check("pilot exposes the posting checklist", /Content360 handoff checklist/.test(bridge) && /Tag people/.test(bridge) && /Location/.test(bridge));
check("pilot states the media-transfer limitation honestly", /does not receive the media automatically/.test(bridge));
check("pilot contains no Anthropic API key", !/sk-ant-/.test(bridge));

check("existing app still provides assemble()", /function assemble\(\)/.test(app));
check("existing app still exposes media count for the bridge", /window\.__images = images/.test(app));
check("existing native share workflow remains present", /id="share">Share photo \+ caption</.test(app));
check("existing offline draft queue remains present", /const QUEUE_KEY = "cs-queued-draft"/.test(app));

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
}
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
