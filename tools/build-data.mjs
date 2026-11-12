// Builds data/countries.js and data/world.js from the raw downloads in raw/.
// Run: node tools/build-data.mjs
//
// Sources (re-download into raw/ to refresh):
//   raw/mledoze.json   https://raw.githubusercontent.com/mledoze/countries/master/countries.json  (ODbL)
//   raw/pop.json       https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?date=2023&format=json&per_page=400
//   raw/world-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json  (Natural Earth, public domain)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { CURATED, LINE_FIXES } from "./facts-source.mjs";
import { MORE } from "./facts-more.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const mledoze = read("raw/mledoze.json");
const popRows = read("raw/pop.json")[1];
const world = read("raw/world-50m.json");

// 193 UN members + 4 widely recognised extras = 197 playable countries.
const EXTRAS = ["VAT", "PSE", "UNK", "TWN"];
const selected = mledoze.filter((c) => c.unMember || EXTRAS.includes(c.cca3));
if (selected.length !== 197) throw new Error(`expected 197 countries, got ${selected.length}`);
const codes = new Set(selected.map((c) => c.cca3));

// Population: World Bank 2023. Kosovo is XKX there; Taiwan and Vatican aren't listed.
const pop = Object.fromEntries(popRows.filter((r) => r.value).map((r) => [r.countryiso3code, r.value]));
pop.UNK = pop.XKX;
pop.TWN = 23_400_000; // Taiwan national statistics, 2023
pop.VAT = 800; // Holy See press office estimate

// Countries that drive on the left (sovereign states only).
const LEFT = new Set(
  "ATG AUS BHS BGD BRB BTN BWA BRN CYP DMA SWZ FJI GRD GUY IND IDN IRL JAM JPN KEN KIR LSO MWI MYS MDV MLT MUS MOZ NAM NRU NPL NZL PAK PNG KNA LCA VCT WSM SYC SGP SLB ZAF LKA SUR TZA THA TLS TON TTO TUV UGA GBR ZMB ZWE".split(" ")
);
for (const c of LEFT) if (!codes.has(c)) throw new Error(`unknown left-drive code ${c}`);

// Display-name fixes and alternative names accepted by spelling prompts.
const RENAME = { COG: "Republic of the Congo" };
const ALIASES = {
  CIV: ["Côte d'Ivoire"],
  TUR: ["Turkey"],
  CZE: ["Czech Republic"],
  SWZ: ["Swaziland"],
  CPV: ["Cabo Verde"],
  TLS: ["East Timor"],
  MMR: ["Burma"],
  COG: ["Congo"],
  COD: ["Democratic Republic of the Congo"],
  MKD: ["Macedonia"],
  VAT: ["Vatican"],
};

// Dataset lists maritime-only neighbours for these; they share no land border.
const NOT_LAND_BORDER = new Set(["LKA-IND"]);

// The dataset uses regional variant names for some official languages.
const LANG_NORMAL = {
  "Austro-Bavarian German": "German",
  "Swiss German": "German",
  Moldavian: "Romanian",
  "Norwegian Nynorsk": "Norwegian",
  "Norwegian Bokmål": "Norwegian",
  "Persian (Farsi)": "Persian",
};
// Languages the dataset lists that have no official or recognised status there.
const LANG_DROP = { AZE: ["Russian"], TKM: ["Russian"], UZB: ["Russian"] };
const normLangs = (code, obj) =>
  [...new Set(Object.values(obj || {}).map((l) => LANG_NORMAL[l] || l))].filter((l) => !(LANG_DROP[code] || []).includes(l));

const countries = selected
  .map((c) => {
    if (!pop[c.cca3]) throw new Error(`no population for ${c.cca3}`);
    return {
      id: c.cca3,
      num: c.ccn3 || null,
      name: RENAME[c.cca3] || c.name.common,
      aliases: ALIASES[c.cca3] || [],
      flag: c.flag,
      region: c.region,
      subregion: c.subregion,
      languages: normLangs(c.cca3, c.languages),
      landlocked: !!c.landlocked,
      borders: (c.borders || []).filter((b) => codes.has(b) && !NOT_LAND_BORDER.has(`${c.cca3}-${b}`)),
      area: c.area,
      pop: pop[c.cca3],
      capitals: c.capital || [],
      currencies: Object.values(c.currencies || {}).map((x) => x.name),
      drive: LEFT.has(c.cca3) ? "left" : "right",
      latlng: c.latlng,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Borders must be symmetric.
const byId = Object.fromEntries(countries.map((c) => [c.id, c]));
for (const c of countries)
  for (const b of c.borders)
    if (!byId[b].borders.includes(c.id)) throw new Error(`asymmetric border ${c.id}->${b}`);

// Map features -> which country a click counts for.
const numToId = Object.fromEntries(countries.filter((c) => c.num).map((c) => [c.num, c.id]));
const TERRITORY = {
  // numeric id -> sovereign
  "580": "USA", "850": "USA", "316": "USA", "016": "USA", "630": "USA",
  "239": "GBR", "086": "GBR", "654": "GBR", "612": "GBR", "660": "GBR", "238": "GBR", "136": "GBR",
  "060": "GBR", "092": "GBR", "796": "GBR", "500": "GBR", "832": "GBR", "831": "GBR", "833": "GBR",
  "570": "NZL", "184": "NZL",
  "533": "NLD", "531": "NLD", "534": "NLD",
  "666": "FRA", "876": "FRA", "663": "FRA", "652": "FRA", "258": "FRA", "540": "FRA", "260": "FRA",
  "248": "FIN", "304": "DNK", "234": "DNK",
  "446": "CHN", "344": "CHN",
  "334": "AUS", "574": "AUS",
};
const BY_NAME = { Kosovo: "UNK", Somaliland: "SOM", "N. Cyprus": "CYP", "Indian Ocean Ter.": "AUS" };
const DISPUTED = new Set(["W. Sahara", "Siachen Glacier"]);


function mapFeatures(topo, label) {
  topo.objects.countries.geometries = topo.objects.countries.geometries
    .filter((g) => g.id !== "010") // Antarctica is not on the board
    .map((g) => {
      const name = g.properties.name;
      const owner = DISPUTED.has(name) ? "DISPUTED" : numToId[g.id] || TERRITORY[g.id] || BY_NAME[name] || null;
      if (!owner) throw new Error(`${label}: unmapped feature ${g.id} ${name}`);
      const props = { owner };
      // Territories carry a readable name so the game can say "Denmark · Greenland".
      if (owner === "DISPUTED") props.part = name.replace(/^W\. /, "Western ");
      else if (!numToId[g.id] && owner !== "UNK") props.part = prettyTerritory(name);
      return { ...g, properties: props };
    });
  return topo;
}
mapFeatures(world, "50m");
const worldLo = mapFeatures(read("raw/world-110m.json"), "110m");

function prettyTerritory(name) {
  const FIXED = {
    "S. Geo. and the Is.": "South Georgia",
    "Br. Indian Ocean Ter.": "British Indian Ocean Territory",
    "Indian Ocean Ter.": "Christmas and Cocos Islands",
    "Heard I. and McDonald Is.": "Heard Island",
    "Fr. S. Antarctic Lands": "French Southern Lands",
    "Faeroe Is.": "Faroe Islands",
    "N. Cyprus": "Northern Cyprus",
  };
  if (FIXED[name]) return FIXED[name];
  return name
    .replace(/\bIs\.$/, "Islands")
    .replace(/^Fr\. /, "French ")
    .replace(/^N\. /, "Northern ")
    .replace(/^St[-.] ?/, "Saint ");
}

const onMap = new Set(world.objects.countries.geometries.map((g) => g.properties.owner));
const missing = countries.filter((c) => !onMap.has(c.id)).map((c) => c.id);
console.log(`countries: ${countries.length}, features: ${world.objects.countries.geometries.length} (lo ${worldLo.objects.countries.geometries.length}), marker-only: ${missing.join(",") || "none"}`);

// ---------------- trivia sets ----------------
const require = createRequire(import.meta.url);
const d3 = require("../vendor/d3.min.js");
const topojson = require("../vendor/topojson-client.min.js");
const NAME = Object.fromEntries(countries.map((c) => [c.id, c.name]));
const factSets = [];
const addSet = (set) => {
  for (const id of Object.keys(set.answers)) if (!NAME[id]) throw new Error(`${set.id}: unknown country ${id}`);
  factSets.push(set);
};
for (const s of [...CURATED, ...MORE]) addSet(s);
const dupIds = factSets.map((s) => s.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dupIds.length) throw new Error("duplicate set ids " + dupIds);

// Latitude lines, computed from the map outlines (then hand-corrected).
const LINES = {
  equator: { lat: 0, text: "Pin a country the Equator passes through.", topic: "Equator", why: "The Equator crosses the land of" },
  cancer: { lat: 23.4362, text: "Pin a country the Tropic of Cancer passes through.", topic: "Tropic of Cancer", why: "The Tropic of Cancer (23.4°N) crosses" },
  capricorn: { lat: -23.4362, text: "Pin a country the Tropic of Capricorn passes through.", topic: "Tropic of Capricorn", why: "The Tropic of Capricorn (23.4°S) crosses" },
  arctic: { lat: 66.5622, text: "Pin a country the Arctic Circle passes through.", topic: "Arctic Circle", why: "The Arctic Circle (66.6°N) crosses" },
  meridian: { lon: 0, text: "Pin a country the Prime Meridian (0° longitude) passes through.", topic: "Prime meridian (Greenwich)", why: "The Prime Meridian runs through" },
};
const lineHits = Object.fromEntries(Object.keys(LINES).map((k) => [k, {}]));
for (const f of topojson.feature(world, world.objects.countries).features) {
  const { owner, part } = f.properties;
  if (owner === "DISPUTED") continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const p of polys) {
    const [[x0, y0], [x1, y1]] = d3.geoBounds({ type: "Polygon", coordinates: p });
    for (const [k, L] of Object.entries(LINES)) {
      const hit = L.lat !== undefined ? y0 < L.lat && y1 > L.lat : x0 <= x1 && x0 < 0 && x1 > 0;
      if (hit && lineHits[k][owner] === undefined) lineHits[k][owner] = part ? `via ${part}` : "";
    }
  }
}
for (const [k, L] of Object.entries(LINES)) {
  const hits = lineHits[k];
  for (const r of LINE_FIXES[k].remove) delete hits[r];
  for (const [id, d] of Object.entries(LINE_FIXES[k].add)) hits[id] = `via ${d}`;
  const answers = Object.fromEntries(Object.entries(hits).map(([id, via]) => [id, via ? `${NAME[id]}, ${via}` : NAME[id]]));
  addSet({ id: k, family: "lines", text: L.text, topic: L.topic, source: "Computed from Natural Earth outlines", why: L.why, answers });
}

// Production rankings from Our World in Data (FAO for crops, Energy Institute for fuels).
const PRODUCE = [
  ["coffee-bean-production", "coffee", "crops", "Coffee production by country", "t"],
  ["cocoa-bean-production", "cocoa beans", "crops", "Cocoa bean production by country", "t"],
  ["rice-production", "rice", "crops", "Rice production by country", "t"],
  ["wheat-production", "wheat", "crops", "Wheat production by country", "t"],
  ["banana-production", "bananas", "crops", "Banana production by country", "t"],
  ["maize-production", "maize (corn)", "crops", "Maize production by country", "t"],
  ["potato-production", "potatoes", "crops", "Potato production by country", "t"],
  ["soybean-production", "soybeans", "crops", "Soybean production by country", "t"],
  ["sugar-cane-production", "sugar cane", "crops", "Sugarcane production by country", "t"],
  ["avocado-production", "avocados", "crops", "Avocado production by country", "t"],
  ["orange-production", "oranges", "crops", "Orange production by country", "t"],
  ["oil-production-by-country", "crude oil", "resources", "List of countries by oil production", "twh"],
  ["gas-production-by-country", "natural gas", "resources", "List of countries by natural gas production", "twh"],
  ["coal-production-by-country", "coal", "resources", "List of countries by coal production", "twh"],
];
const OWID_CODE = { OWID_KOS: "UNK" };
const fmtAmount = (v, unit) =>
  unit === "t"
    ? v >= 1e6 ? `${(v / 1e6).toFixed(1)} million tonnes` : `${Math.round(v / 1000).toLocaleString("en-US")} thousand tonnes`
    : `${Math.round(v).toLocaleString("en-US")} TWh of energy`;
for (const [file, label, family, topic, unit] of PRODUCE) {
  const rows = readFileSync(join(root, `raw/owid-${file}.csv`), "utf8").trim().split(/\r?\n/).slice(1)
    .map((l) => {
      const m = l.match(/^("?)(.*?)\1,([^,]*),(\d+),([\d.eE+-]+)$/);
      return m && { code: OWID_CODE[m[3]] || m[3], year: +m[4], v: +m[5] };
    })
    .filter((r) => r && NAME[r.code]);
  const year = Math.max(...rows.map((r) => r.year));
  const top = rows.filter((r) => r.year === year && r.v > 0).sort((a, b) => b.v - a.v).slice(0, 10);
  if (top.length < 10) throw new Error(`${file}: only ${top.length} producers in ${year}`);
  const answers = Object.fromEntries(top.map((r, i) => [r.code, `${NAME[r.code]} ranks #${i + 1} in the world for ${label}: ${fmtAmount(r.v, unit)} in ${year}`]));
  const src = unit === "t" ? `FAO via Our World in Data (${year})` : `Energy Institute via Our World in Data (${year})`;
  addSet({ id: file, family, topic, source: src, text: `Pin one of the world's top 10 producers of ${label}.`, why: "", answers });
}
console.log(`fact sets: ${factSets.length}`);

const banner = "// Generated by tools/build-data.mjs - do not edit by hand.\n";
writeFileSync(join(root, "data/countries.js"), `${banner}globalThis.COUNTRIES = ${JSON.stringify(countries)};\nif (typeof module !== "undefined") module.exports = globalThis.COUNTRIES;\n`);
writeFileSync(join(root, "data/facts.js"), `${banner}globalThis.FACT_SETS = ${JSON.stringify(factSets)};\nif (typeof module !== "undefined") module.exports = globalThis.FACT_SETS;\n`);
writeFileSync(join(root, "data/world.js"), `${banner}globalThis.WORLD = ${JSON.stringify(world)};\nglobalThis.WORLD_LO = ${JSON.stringify(worldLo)};\n`);
