// Sanity tests for the prompt engine. Run: node tools/check-prompts.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const E = require("../js/prompts.js");

let failures = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
};
const set = (id) => {
  const p = E.BY_PROMPT[id];
  ok(p, `prompt ${id} exists`);
  return new Set(p ? p.answers : []);
};
const same = (id, expected) => {
  const got = [...set(id)].sort().join(",");
  const want = [...expected].sort().join(",");
  ok(got === want, `${id}\n   got:  ${got}\n   want: ${want}`);
};
const has = (id, yes = [], no = []) => {
  const s = set(id);
  for (const y of yes) ok(s.has(y), `${id} should include ${y}`);
  for (const n of no) ok(!s.has(n), `${id} should NOT include ${n}`);
};

// ---- structural checks on every prompt ----
ok(E.COUNTRIES.length === 197, "197 countries");
const ids = new Set();
for (const p of E.POOL) {
  ok(!ids.has(p.id), `unique id ${p.id}`);
  ids.add(p.id);
  ok(p.answers.length >= 2, `${p.id} has >=2 answers`);
  ok(new Set(p.answers).size === p.answers.length, `${p.id} no duplicate answers`);
  ok(p.answers.every((a) => E.BY_ID[a]), `${p.id} answers are real countries`);
  ok(Object.values(p.tiers).includes(4), `${p.id} has a Longshot answer`);
  ok(p.answers.every((a) => p.tiers[a] >= 0 && p.tiers[a] <= 4), `${p.id} tiers in range`);
  ok(/^Pin .+\.$/.test(p.text), `${p.id} text reads "Pin ...": ${p.text}`);
  for (const a of p.answers) {
    const w = p.why(E.BY_ID[a]);
    ok(typeof w === "string" && w.length > 10 && !/undefined|NaN/.test(w), `${p.id} why renders for ${a}: ${w}`);
  }
  for (const c of E.COUNTRIES.slice(0, 40)) {
    const x = E.explain(p, c.id).text;
    ok(!/undefined|NaN/.test(x), `${p.id} explain renders for ${c.id}: ${x}`);
  }
}

// ---- answers we know are right ----
same("border:DEU", ["AUT", "BEL", "CZE", "DNK", "FRA", "LUX", "NLD", "POL", "CHE"]);
same("ends:STAN", ["AFG", "KAZ", "KGZ", "PAK", "TJK", "TKM", "UZB"]);
same("lang:German", ["AUT", "BEL", "DEU", "LIE", "LUX", "NAM", "CHE"]);
same("currency:crown", ["CZE", "DNK", "ISL", "NOR", "SWE"]);
same("borderPair:FRA+DEU", ["BEL", "CHE", "LUX"]);
same("pop:>100M", ["BGD", "BRA", "CHN", "COD", "EGY", "ETH", "IND", "IDN", "JPN", "MEX", "NGA", "PAK", "PHL", "RUS", "USA", "VNM"]);
has("drive:all", ["GBR", "JPN", "IND", "AUS", "ZAF", "THA", "IRL", "CYP", "MLT"], ["USA", "FRA", "CHN", "SAU"]);
has("landlocked:all", ["BOL", "PRY", "MNG", "CHE", "AUT", "ETH", "UNK", "VAT", "SMR"], ["FRA", "BRA", "CHN"]);
has("island:all", ["JPN", "ISL", "AUS", "NZL", "MDG", "CUB", "SGP", "MLT", "LKA"], ["GBR", "IRL", "DOM", "HTI", "IDN", "PNG", "TLS"]);
has("starts:T", ["TUR", "THA", "TWN", "TZA", "TON"]);
has("starts:C", ["CIV", "CZE", "CHN", "COG"]); // Côte d'Ivoire, Czechia, Congo alias
has("starts:B", ["MMR"]); // Burma
has("currency:euro", ["DEU", "FRA", "MNE", "UNK", "VAT", "AND", "MCO", "SMR", "IRL"], ["GBR", "CHE", "DNK"]);
has("currency:dollar", ["USA", "CAN", "AUS", "ECU", "SLV", "TLS"], ["MEX"]);
has("capMisc:contains", ["KWT", "SGP", "VAT", "MEX", "LUX", "MCO", "DJI", "SMR", "AND", "GTM", "PAN"], ["TUN"]);
has("lang:Spanish", ["MEX", "ESP", "ARG", "GNQ"], ["BRA", "PRT"]);
has("lang:Russian", ["RUS", "BLR", "KAZ", "KGZ"], ["UZB", "TKM", "AZE", "UKR"]);
has("border:IND", ["PAK", "CHN", "NPL", "BTN", "BGD", "MMR"], ["LKA"]);
has("border:CHN", ["IND", "PAK", "RUS", "MNG", "KAZ", "PRK", "VNM", "LAO", "MMR", "NPL", "BTN", "AFG", "KGZ", "TJK"]);
has("subregion:South America", ["BRA", "ARG", "CHL", "PER", "COL", "VEN", "ECU", "BOL", "PRY", "URY", "GUY", "SUR"], ["PAN", "MEX"]);
has("area:>2M", ["RUS", "CAN", "USA", "CHN", "BRA", "AUS", "IND", "ARG", "KAZ", "DZA", "COD", "SAU"], ["MEX"]);

// ---- trivia sets ----
same("river:danube", ["DEU", "AUT", "SVK", "HUN", "HRV", "SRB", "ROU", "BGR", "MDA", "UKR"]);
same("lines:equator", ["ECU", "COL", "BRA", "STP", "GAB", "COG", "COD", "UGA", "KEN", "SOM", "IDN"]);
same("lines:meridian", ["GBR", "FRA", "ESP", "DZA", "MLI", "BFA", "TGO", "GHA"]);
same("landmarks:disney", ["USA", "FRA", "JPN", "CHN"]);
has("lines:arctic", ["NOR", "SWE", "FIN", "RUS", "USA", "CAN", "DNK", "ISL"]);
has("sea:mediterranean", ["ESP", "MCO", "BIH", "PSE", "MAR"], ["PRT", "JOR"]);
ok(E.POOL.filter((p) => ["crops", "resources"].includes(p.family)).length === 14, "14 production prompts");
ok(E.explain(E.BY_PROMPT["border:DEU"], "FRA").text.includes("shares a land border with Germany"), "explain correct answer");
ok(E.explain(E.BY_PROMPT["border:DEU"], "ESP").text.startsWith("Spain doesn't fit"), "explain wrong answer");
ok(E.profile("HUN").trivia.some((t) => t.text.includes("Budapest")), "profile trivia for Hungary");

// ---- daily ----
const k = "2026-11-11";
const d1 = E.dailyPrompts(k).map((p) => p.id);
const d2 = E.dailyPrompts(k).map((p) => p.id);
ok(d1.join() === d2.join(), "daily is deterministic");
ok(new Set(d1).size === 5, "daily has 5 distinct prompts");
ok(E.dailyNumber("2026-11-11") === 1 && E.dailyNumber("2026-11-12") === 2 && E.dailyNumber("2027-11-11") === 366, "daily numbering");
for (let i = 0; i < 400; i++) {
  const day = new Date(Date.UTC(2026, 10, 11 + i)).toISOString().slice(0, 10);
  const fams = E.dailyPrompts(day).map((p) => p.family);
  ok(new Set(fams).size === 5, `daily ${day} uses 5 different families`);
  ok(new Set(E.dailyPrompts(day).map((p) => p.id)).size === 5, `daily ${day} has 5 distinct prompts`);
}

// ---- report ----
const fams = Object.entries(E.FAMILIES).map(([f, ps]) => `${f}:${ps.length}`).join("  ");
console.log(`prompts: ${E.POOL.length}\n${fams}`);
console.log("today:", E.dailyPrompts(k).map((p) => `\n  ${p.text} (${p.answers.length} answers)`).join(""));
if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed.");
