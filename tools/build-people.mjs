// Builds data/people.js for the "Who lived here?" mode from Wikidata exports in raw/.
// Run: node tools/build-people.mjs
//
// Source: Wikidata (CC0), queried through QLever (https://qlever.dev/api/wikidata).
// The three queries are saved next to this file in tools/people-queries.md. They select every
// person who has died, has a birth place and a death place with coordinates, and has a
// Wikipedia article in at least 65 languages. That language count is the fame score: it's
// the best open signal of how widely known someone is around the world.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8")).results.bindings;
const d3 = require("../vendor/d3.min.js");
const topojson = require("../vendor/topojson-client.min.js");
require("../data/world.js");
const COUNTRIES = require("../data/countries.js");
const NAME = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.name]));

const qid = (u) => u.slice(u.lastIndexOf("/") + 1);
const v = (row, k) => row[k]?.value;

// Never asked: religious founders (dates and portraits are matters of faith, not record).
const SKIP = new Set(["Q302", "Q9458", "Q9441"]);

const aliases = Object.fromEntries(read("raw/people-alias.json").map((r) => [qid(v(r, "p")), v(r, "alts").split("|")]));
const places = Object.fromEntries(read("raw/people-place.json").map((r) => [qid(v(r, "pl")), { label: v(r, "label"), admin: v(r, "admin") }]));

// Countries on our map, for "born in <country>".
const features = topojson.feature(globalThis.WORLD, globalThis.WORLD.objects.countries).features.filter((f) => f.properties.owner !== "DISPUTED");
function countryAt(lon, lat) {
  for (const r of [0, 0.15, 0.4, 0.8])
    for (const [dx, dy] of r ? [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]] : [[0, 0]]) {
      const f = features.find((f) => d3.geoContains(f, [lon + dx, lat + dy]));
      if (f) return f.properties.owner;
    }
  return null;
}

const point = (wkt) => {
  const m = /point\(([-\d.eE]+) ([-\d.eE]+)\)/i.exec(wkt || "");
  return m ? [+(+m[1]).toFixed(3), +(+m[2]).toFixed(3)] : null;
};
// A hospital or palace means little on its own; add the town it's in.
const VENUE = /smriti|dacha|memorial|museum|fort|temple|mosque|bhavan|bhawan|hospital|clinic|medical|cent(re|er)\b|palace|house|bunker|castle|manor|estate|hotel|prison|street|cathedral|church|monastery|abbey|villa|mansion|residence|apartment|building|sanatorium|infirmary|château|schloss|nursing|home\b|farm|camp\b|station|airport|ship|university|college/i;
function placeName(id) {
  const p = places[id];
  if (!p) return null;
  return VENUE.test(p.label) && p.admin && !p.label.includes(p.admin) ? `${p.label}, ${p.admin}` : p.label;
}

// Wikidata time: "1869-10-02T00:00:00Z" (years before 1 CE are negative, 1 BC = 0).
// A person can have several recorded dates; prefer the most specific one. The precision
// we can sample isn't tied to a particular date, so infer it: 1 January means "that year".
function date(values, precision) {
  const all = String(values || "").split("|").map((v) => /^([+-]?)(\d+)-(\d\d)-(\d\d)/.exec(v)).filter(Boolean);
  const m = all.find((x) => x[4] !== "01") || all.find((x) => x[3] !== "01") || all[0];
  if (!m || (precision !== undefined && +precision < 9)) return null;
  const prec = m[4] !== "01" ? 11 : m[3] !== "01" ? (+precision >= 11 ? 11 : 10) : 9;
  let y = +m[2];
  if (m[1] === "-") y = -y;
  return { y, m: prec >= 10 ? +m[3] : 0, d: prec >= 11 ? +m[4] : 0 };
}

const cleanAlias = (a) => a.trim();
const people = [];
const dropped = { date: 0, place: 0, skip: 0, country: 0 };
for (const r of read("raw/people-main.json")) {
  const id = qid(v(r, "p"));
  if (SKIP.has(id)) { dropped.skip++; continue; }
  const name = v(r, "n");
  const b = date(v(r, "bs"), v(r, "bpr")), d = date(v(r, "dsd"), v(r, "dpr"));
  if (!b || !d || d.y < b.y || d.y - b.y > 120) { dropped.date++; continue; }
  const bc = point(v(r, "bcs")), dc = point(v(r, "dcs"));
  const bp = placeName(qid(v(r, "bps"))), dp = placeName(qid(v(r, "dps")));
  if (!bc || !dc || !bp || !dp) { dropped.place++; continue; }
  const bi = countryAt(...bc), di = countryAt(...dc);
  if (!bi && !di) { dropped.country++; continue; }
  const img = v(r, "imgs");
  const art = v(r, "art");
  people.push({
    id,
    name,
    aka: [...new Set((aliases[id] || []).map(cleanAlias))].filter((a) => a.length >= 3 && a.length <= 40 && /^[\p{Script=Latin}\s.'’\-,()0-9&]+$/u.test(a) && a !== name).slice(0, 12),
    desc: (v(r, "ds") || "").replace(/\s*\([^)]*\d{3,4}[^)]*\)\s*$/, ""), // dates are shown separately
    fame: +v(r, "sls"),
    born: { ...b, place: bp, at: bc, c: bi },
    died: { ...d, place: dp, at: dc, c: di },
    img: img ? decodeURIComponent(img.slice(img.lastIndexOf("/") + 1)) : null,
    wiki: art ? decodeURIComponent(art.slice(art.lastIndexOf("/") + 1)).replace(/_/g, " ") : null,
    f: v(r, "g")?.endsWith("Q6581072") || v(r, "g")?.endsWith("Q1052281") ? 1 : 0,
  });
}
people.sort((a, b) => b.fame - a.fame || a.name.localeCompare(b.name));

const unknown = people.flatMap((p) => [p.born.c, p.died.c]).filter((c) => c && !NAME[c]);
if (unknown.length) throw new Error("unknown country codes " + [...new Set(unknown)]);

const banner = "// Generated by tools/build-people.mjs from Wikidata (CC0) - do not edit by hand.\n";
writeFileSync(join(root, "data/people.js"), `${banner}globalThis.PEOPLE = ${JSON.stringify(people)};\nif (typeof module !== "undefined") module.exports = globalThis.PEOPLE;\n`);
const hist = {};
for (const p of people) hist[p.fame >= 180 ? "180+" : p.fame >= 130 ? "130+" : p.fame >= 100 ? "100+" : p.fame >= 80 ? "80+" : "65+"] = (hist[p.fame >= 180 ? "180+" : p.fame >= 130 ? "130+" : p.fame >= 100 ? "100+" : p.fame >= 80 ? "80+" : "65+"] || 0) + 1;
console.log(`people: ${people.length} (dropped ${JSON.stringify(dropped)}), by languages: ${JSON.stringify(hist)}, with photo: ${people.filter((p) => p.img).length}, women: ${people.filter((p) => p.f).length}`);
