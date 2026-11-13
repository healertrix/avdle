// Longshot prompt engine.
//
// Prompts come from two places:
//  1. Templates over the country facts (data/countries.js): borders, languages, names...
//  2. Trivia sets (data/facts.js): rivers, seas, animals, crops, landmarks, sport...
// Every answer list is computed or curated in data, never typed into a prompt.
// Every prompt can explain WHY a country counts (`why`) and show a related fact (`fact`).
// Works in the browser and in Node (for tests).
(function (root) {
  "use strict";

  const load = (g, path) => root[g] || (typeof require !== "undefined" ? require(path) : null);
  const COUNTRIES = load("COUNTRIES", "../data/countries.js");
  const FACT_SETS = load("FACT_SETS", "../data/facts.js") || [];
  if (!COUNTRIES) throw new Error("COUNTRIES data not loaded");
  const BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));

  // ---------- rarity ----------
  const TIERS = [
    { key: "charted", label: "Well-charted", points: 100, emoji: "🟩" },
    { key: "mapped", label: "Mapped", points: 250, emoji: "🟦" },
    { key: "remote", label: "Remote", points: 450, emoji: "🟪" },
    { key: "uncharted", label: "Uncharted", points: 700, emoji: "🟧" },
    { key: "dragons", label: "Here be dragons", points: 1000, emoji: "🟥" },
  ];

  // How likely a player is to think of a country first. With no player data,
  // population and size are a good proxy; a few famous small places get a bump.
  const FAME_BONUS = { VAT: 3, MCO: 1.5, ISL: 1, SGP: 0.6, LUX: 0.6, MLT: 0.5, JAM: 0.5, ISR: 0.4, QAT: 0.4, CHE: 0.4, NZL: 0.5, IRL: 0.4 };
  const fame = (c) => Math.log10(c.pop) + 0.35 * Math.log10(c.area + 1) + (FAME_BONUS[c.id] || 0);

  // Most famous answers are Well-charted; the least famous ~10% (at least one) are Here be dragons.
  function rankAnswers(answers) {
    const sorted = [...answers].sort((a, b) => fame(BY_ID[b]) - fame(BY_ID[a]) || a.localeCompare(b));
    const n = sorted.length;
    const top = Math.max(1, Math.ceil(n * 0.1));
    const rest = n - top;
    const tiers = {};
    sorted.forEach((id, i) => {
      tiers[id] = i >= rest ? 4 : Math.min(3, Math.floor((i / rest) * 4));
    });
    return tiers;
  }

  // ---------- helpers ----------
  const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const letters = (s) => strip(s).replace(/[^A-Za-z]/g, "").toUpperCase();
  const names = (c) => [c.name, ...c.aliases];
  const matchName = (c, f) => names(c).find(f);
  const anyName = (c, f) => !!matchName(c, f);
  const isOneWord = (s) => !/[\s-]/.test(s.trim());
  const fmt = (n) => n.toLocaleString("en-US");
  const fmtPop = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + " billion" : n >= 1e6 ? (n / 1e6).toFixed(1) + " million" : fmt(n));
  const list = (ids) => ids.map((id) => BY_ID[id].name).join(", ");
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const nameLabel = (c, n) => (n === c.name ? `"${n}"` : `"${n}" (another name for ${c.name})`);

  const REGIONS = {
    Africa: "an African country",
    Asia: "an Asian country",
    Europe: "a European country",
    Americas: "a country in the Americas",
    Oceania: "a country in Oceania",
  };
  const REGION_NAME = { Africa: "Africa", Asia: "Asia", Europe: "Europe", Americas: "the Americas", Oceania: "Oceania" };
  const SUBREGIONS = {
    Caribbean: ["a Caribbean country", "the Caribbean"],
    "Central America": ["a Central American country", "Central America"],
    "South America": ["a South American country", "South America"],
    "Central Asia": ["a Central Asian country", "Central Asia"],
    "South-Eastern Asia": ["a Southeast Asian country", "Southeast Asia"],
    "Eastern Asia": ["an East Asian country", "East Asia"],
    "Southern Asia": ["a South Asian country", "South Asia"],
    "Western Africa": ["a West African country", "West Africa"],
    "Eastern Africa": ["an East African country", "East Africa"],
    "Northern Africa": ["a North African country", "North Africa"],
    "Middle Africa": ["a Central African country", "Central Africa"],
    Melanesia: ["a country in Melanesia", "Melanesia"],
    Polynesia: ["a country in Polynesia", "Polynesia"],
    Micronesia: ["a country in Micronesia (the Pacific region)", "Micronesia"],
  };

  // Short facts shown when a pick is wrong ("here's what's true instead").
  const FACTS = {
    lang: (c) => `Languages of ${c.name}: ${c.languages.join(", ")}`,
    borders: (c) => (c.borders.length ? `${c.name} borders ${c.borders.length}: ${list(c.borders)}` : `${c.name} has no land borders`),
    landlocked: (c) => (c.landlocked ? `${c.name} is landlocked` : `${c.name} has a coastline`),
    drive: (c) => `${c.name} drives on the ${c.drive}`,
    name: (c) => (c.aliases.length ? `${c.name} (also called ${c.aliases.join(", ")})` : c.name),
    capital: (c) => `Capital of ${c.name}: ${c.capitals.join(" / ")}`,
    currency: (c) => `Currency of ${c.name}: ${c.currencies.join(", ")}`,
    region: (c) => `${c.name} is in ${c.subregion || c.region}`,
    area: (c) => `${c.name}: ${fmt(Math.round(c.area))} km²`,
    pop: (c) => `${c.name}: ${fmtPop(c.pop)} people (2023)`,
  };

  // ---------- trivia sets indexed by country (for "Did you know") ----------
  const sentence = (set, detail) => `${set.why} ${detail}.`.trim().replace(/\.\.$/, ".");
  const TRIVIA_BY_COUNTRY = {};
  for (const set of FACT_SETS)
    for (const [id, detail] of Object.entries(set.answers))
      (TRIVIA_BY_COUNTRY[id] = TRIVIA_BY_COUNTRY[id] || []).push({ set: set.id, family: set.family, topic: set.topic, text: sentence(set, detail) });

  // ---------- templates ----------
  // `weight` controls how often a family is drawn, so big families don't crowd out the rest.
  const FAMILY_WEIGHTS = {
    lang: 2.5, langRegion: 1.5, border: 3, borderPair: 1.5, borderCount: 1, landlocked: 1.2, island: 1.2,
    drive: 1.2, starts: 2, regionStarts: 2, ends: 1.5, nameLen: 1.5, contains: 1.5, nameMisc: 1.2,
    capStarts: 1.5, capMisc: 1, currency: 2, subregion: 1.2, area: 1.2, pop: 1.2,
    river: 2.5, sea: 2.5, mountains: 2, desert: 1.5, lines: 2.5, animals: 2.5, landmarks: 2, sport: 2,
    science: 1.5, crops: 3, resources: 2,
    origins: 2.5, food: 2.5, voyages: 2, history: 2.5, culture: 2, politics: 2.5, flags: 1.5, nature: 2, lakes: 1.5,
    sizeVs: 1.5, popVs: 1.5, neighbourSize: 1.2, twoAway: 1.5, rank: 1.5, density: 1, borderExact: 1, subMix: 1.2, langSub: 1,
    currencyRegion: 1, capRegion: 1,
  };
  const FAMILY_LABEL = {
    lang: "Language", langRegion: "Language", border: "Borders", borderPair: "Borders", borderCount: "Borders", landlocked: "Coastlines",
    island: "Coastlines", drive: "On the road", starts: "Names", regionStarts: "Names", ends: "Names", nameLen: "Names", contains: "Names",
    nameMisc: "Names", capStarts: "Capitals", capMisc: "Capitals", currency: "Money", subregion: "Regions", area: "Size", pop: "People",
    river: "Rivers", sea: "Seas", mountains: "Mountains", desert: "Deserts", lines: "Lines on the map", animals: "Wildlife",
    landmarks: "Landmarks", sport: "Sport", science: "Science", crops: "Crops", resources: "Resources",
    origins: "Where it began", food: "Food & drink", voyages: "Famous journeys", history: "History", culture: "Culture",
    politics: "Politics", flags: "Flags", nature: "Nature", lakes: "Lakes",
    sizeVs: "Size", popVs: "People", neighbourSize: "Neighbours", twoAway: "Borders", rank: "Rankings", density: "People",
    borderExact: "Borders", subMix: "Regions", langSub: "Language", currencyRegion: "Money", capRegion: "Capitals",
  };

  function buildPool() {
    const pool = [];
    // why(c) -> sentence explaining a correct answer; fact(c) -> short fact for any country.
    const add = (family, id, text, test, why, fact, opts = {}) => {
      const min = opts.min ?? 3;
      const max = opts.max ?? 75;
      const answers = COUNTRIES.filter(test).map((c) => c.id);
      if (answers.length < min || answers.length > max) return;
      pool.push({ id: `${family}:${id}`, family, text, answers, why, fact, note: opts.note || "", topic: opts.topic || null, source: opts.source || "" });
    };
    const regionEntries = Object.entries(REGIONS);

    // Languages
    const langs = [...new Set(COUNTRIES.flatMap((c) => c.languages))];
    const LANG_NOTE = "Counts official and recognised national languages.";
    const langWhy = (l) => (c) => `${l} is an official language of ${c.name}${c.languages.length > 1 ? ` (alongside ${c.languages.filter((x) => x !== l).join(", ")})` : ""}.`;
    for (const l of langs)
      add("lang", l, `Pin a country where ${l} is an official language.`, (c) => c.languages.includes(l), langWhy(l), FACTS.lang, { note: LANG_NOTE, topic: `${l} language` });
    for (const l of ["English", "French", "Arabic", "Spanish", "Portuguese"])
      for (const [r, subj] of regionEntries)
        add("langRegion", `${l}/${r}`, `Pin ${subj} where ${l} is an official language.`, (c) => c.region === r && c.languages.includes(l), langWhy(l), FACTS.lang,
          { note: LANG_NOTE, topic: `${l} language` });

    // Borders (land borders only)
    const BORDER_NOTE = "Land borders only.";
    for (const x of COUNTRIES)
      add("border", x.id, `Pin a country that borders ${x.name}.`, (c) => c.borders.includes(x.id),
        (c) => `${c.name} shares a land border with ${x.name}. ${x.name}'s neighbours: ${list(x.borders)}.`, FACTS.borders, { note: BORDER_NOTE, topic: x.name });
    for (let i = 0; i < COUNTRIES.length; i++)
      for (let j = i + 1; j < COUNTRIES.length; j++) {
        const a = COUNTRIES[i], b = COUNTRIES[j];
        add("borderPair", `${a.id}+${b.id}`, `Pin a country that borders both ${a.name} and ${b.name}.`,
          (c) => c.borders.includes(a.id) && c.borders.includes(b.id), (c) => `${c.name} touches both ${a.name} and ${b.name} by land.`, FACTS.borders, { min: 2, note: BORDER_NOTE });
      }
    const nbWhy = (c) => `${c.name} has ${c.borders.length} land neighbour${c.borders.length === 1 ? "" : "s"}: ${list(c.borders)}.`;
    for (const n of [6, 7, 8, 9])
      add("borderCount", `>=${n}`, `Pin a country that borders at least ${n} other countries.`, (c) => c.borders.length >= n, nbWhy, FACTS.borders, { note: BORDER_NOTE });
    add("borderCount", "=1", "Pin a country that borders exactly one other country.", (c) => c.borders.length === 1, nbWhy, FACTS.borders, { note: BORDER_NOTE });
    for (const [r, subj] of regionEntries)
      add("borderCount", `=1/${r}`, `Pin ${subj} that borders exactly one other country.`, (c) => c.region === r && c.borders.length === 1, nbWhy, FACTS.borders, { note: BORDER_NOTE });

    // Landlocked / no land borders
    const llWhy = (c) => `${c.name} has no coastline at all; it's surrounded by ${list(c.borders)}.`;
    add("landlocked", "all", "Pin a landlocked country.", (c) => c.landlocked, llWhy, FACTS.landlocked, { topic: "Landlocked country" });
    for (const [r, subj] of regionEntries)
      add("landlocked", r, `Pin ${subj} that is landlocked.`, (c) => c.region === r && c.landlocked, llWhy, FACTS.landlocked, { topic: "Landlocked country" });
    const islWhy = (c) => `${c.name} shares no land border with any country; it is surrounded by sea.`;
    add("island", "all", "Pin a country with no land borders.", (c) => !c.borders.length, islWhy, FACTS.borders, { topic: "Island country" });
    for (const [r, subj] of regionEntries)
      add("island", r, `Pin ${subj} with no land borders.`, (c) => c.region === r && !c.borders.length, islWhy, FACTS.borders, { topic: "Island country" });

    // Driving side
    const dWhy = (c) => `Traffic in ${c.name} keeps to the left${["GBR", "IRL", "MLT", "CYP", "IND", "AUS", "NZL", "ZAF", "KEN", "JAM"].includes(c.id) ? ", a legacy of British road rules" : ""}.`;
    add("drive", "all", "Pin a country where people drive on the left.", (c) => c.drive === "left", dWhy, FACTS.drive, { topic: "Left- and right-hand traffic" });
    for (const [r, subj] of regionEntries)
      add("drive", r, `Pin ${subj} where people drive on the left.`, (c) => c.region === r && c.drive === "left", dWhy, FACTS.drive, { topic: "Left- and right-hand traffic" });

    // Names (any accepted name counts; see ALIASES in tools/build-data.mjs)
    const NAME_NOTE = "Uses common English names; well-known alternatives (e.g. Turkey, Czech Republic) also count.";
    const nameWhy = (f, msg) => (c) => `${nameLabel(c, matchName(c, f))} ${msg}.`;
    for (const L of ALPHA) {
      const f = (n) => letters(n)[0] === L;
      add("starts", L, `Pin a country whose name starts with ${L}.`, (c) => anyName(c, f), nameWhy(f, `starts with ${L}`), FACTS.name, { note: NAME_NOTE });
      for (const [r, subj] of regionEntries)
        add("regionStarts", `${L}/${r}`, `Pin ${subj} whose name starts with ${L}.`, (c) => c.region === r && anyName(c, f),
          (c) => `${nameLabel(c, matchName(c, f))} starts with ${L}, and it's in ${REGION_NAME[r]}.`, FACTS.name, { note: NAME_NOTE });
    }
    for (const suf of ["STAN", "IA", "LAND", "A", "O", "Y", "E", "N", "I", "R", "L", "S", "D", "T", "U"]) {
      const f = (n) => letters(n).endsWith(suf);
      const why = suf === "STAN"
        ? (c) => `${nameLabel(c, matchName(c, f))} ends in -stan, Persian for "land of".`
        : nameWhy(f, `ends in "${suf.toLowerCase()}"`);
      add("ends", suf, `Pin a country whose name ends in "${suf.toLowerCase()}".`, (c) => anyName(c, f), why, FACTS.name, { note: NAME_NOTE });
    }
    for (let n = 4; n <= 11; n++) {
      const f = (x) => isOneWord(x) && letters(x).length === n;
      add("nameLen", `=${n}`, `Pin a country with a one-word name exactly ${n} letters long.`, (c) => anyName(c, f), nameWhy(f, `has ${n} letters`), FACTS.name, { note: NAME_NOTE });
    }
    const short = (x) => letters(x).length <= 4;
    add("nameLen", "<=4", "Pin a country whose name is 4 letters or shorter.", (c) => anyName(c, short), (c) => { const n = matchName(c, short); return `${nameLabel(c, n)} has just ${letters(n).length} letters.`; }, FACTS.name, { note: NAME_NOTE });
    for (const L of ["Z", "X", "Q", "J", "K", "W", "V", "F", "H", "Y"]) {
      const f = (n) => letters(n).includes(L);
      add("contains", L, `Pin a country whose name contains the letter ${L}.`, (c) => anyName(c, f), nameWhy(f, `contains ${L}`), FACTS.name, { note: NAME_NOTE });
    }
    const noA = (n) => !letters(n).includes("A");
    add("contains", "noA", 'Pin a country whose name has no letter "A".', (c) => anyName(c, noA), nameWhy(noA, 'has no "A"'), FACTS.name, { note: NAME_NOTE });
    const dbl = (n) => /(.)\1/.test(letters(n));
    add("nameMisc", "double", "Pin a country whose name has a double letter (like the ss in Russia).", (c) => anyName(c, dbl),
      (c) => { const n = matchName(c, dbl); return `${nameLabel(c, n)} has a double "${letters(n).match(/(.)\1/)[1].toLowerCase()}".`; }, FACTS.name, { note: NAME_NOTE });
    const ends = (n) => { const s = letters(n); return s[0] === s[s.length - 1]; };
    add("nameMisc", "sameEnds", "Pin a country whose name starts and ends with the same letter.", (c) => anyName(c, ends),
      (c) => { const n = matchName(c, ends); return `${nameLabel(c, n)} starts and ends with ${letters(n)[0]}.`; }, FACTS.name, { note: NAME_NOTE });
    const three = (n) => n.trim().split(/[\s-]+/).length >= 3;
    add("nameMisc", "threeWords", "Pin a country whose name is three or more words.", (c) => anyName(c, three), nameWhy(three, "is three or more words"), FACTS.name, { note: NAME_NOTE });
    const dir = (n) => /\b(North|South|East|West|Central)\b/.test(n);
    add("nameMisc", "direction", "Pin a country with North, South, East, West or Central in its name.", (c) => anyName(c, dir), nameWhy(dir, "has a compass direction in it"), FACTS.name, { note: NAME_NOTE });

    // Capitals
    for (const L of ALPHA)
      add("capStarts", L, `Pin a country whose capital starts with ${L}.`, (c) => c.capitals.some((k) => letters(k)[0] === L),
        (c) => `The capital of ${c.name} is ${c.capitals.find((k) => letters(k)[0] === L)}.`, FACTS.capital,
        { note: "Countries with more than one capital count if any of them fits." });
    const capIs = (c) => `The capital of ${c.name} is ${c.capitals.join(" / ")}.`;
    add("capMisc", "sameInitial", "Pin a country whose capital starts with the same letter as the country.", (c) => c.capitals.some((k) => anyName(c, (n) => letters(n)[0] === letters(k)[0])), capIs, FACTS.capital);
    add("capMisc", "contains", "Pin a country whose capital's name contains the full country name.", (c) => c.capitals.some((k) => anyName(c, (n) => letters(k).includes(letters(n)))), capIs, FACTS.capital);
    add("capMisc", "city", 'Pin a country whose capital\'s name includes the word "City".', (c) => c.capitals.some((k) => /\bCity\b/.test(k)), capIs, FACTS.capital);

    // Currencies (word match on the currency's English name)
    const CURRENCY = [
      ["dollar", "a currency called a dollar", /\bdollar\b/],
      ["franc", "a currency called a franc", /\bfranc\b/],
      ["cfa", "the CFA franc", /\bcfa franc\b/],
      ["peso", "a currency called a peso", /\bpeso\b/],
      ["dinar", "a currency called a dinar", /\bdinar\b/],
      ["pound", "a currency called a pound", /\bpound\b/],
      ["rupee", "a currency called a rupee", /\brupee\b/],
      ["shilling", "a currency called a shilling", /\bshilling\b/],
      ["rial", "a currency called a rial or riyal", /\b(rial|riyal)\b/],
      ["crown", 'a "crown" currency (krona, krone, króna or koruna)', /\b(krona|krone|koruna)\b/],
      ["euro", "the euro", /^euro$/],
      ["usd", "the United States dollar", /^united states dollar$/],
      ["dirham", "a currency called a dirham", /\bdirham\b/],
      ["won", "a currency called a won", /\bwon\b/],
      ["kwacha", "a currency called a kwacha", /\bkwacha\b/],
      ["manat", "a currency called a manat", /\bmanat\b/],
      ["leu", "a currency called a leu", /\bleu\b/],
      ["ruble", "a currency called a ruble", /\bruble\b/],
    ];
    for (const [key, phrase, re] of CURRENCY) {
      const m = (x) => re.test(strip(x).toLowerCase());
      add("currency", key, `Pin a country that uses ${phrase}.`, (c) => c.currencies.some(m),
        (c) => `${c.name} uses the ${c.currencies.filter(m).join(" and the ")}.`, FACTS.currency,
        { min: 2, note: "Counts every official currency, including a foreign one a country has adopted." });
    }

    // Regions
    for (const [sub, [subj, nm]] of Object.entries(SUBREGIONS))
      add("subregion", sub, `Pin ${subj}.`, (c) => c.subregion === sub, (c) => `${c.name} is in ${nm}, as defined by the UN geoscheme.`, FACTS.region,
        { note: "Regions follow the UN geoscheme.", topic: nm });

    // Size and population
    const areaWhy = (c) => `${c.name} covers ${fmt(Math.round(c.area))} km².`;
    const AREA = [
      [">1M", "larger than 1,000,000 km²", (c) => c.area > 1e6],
      [">2M", "larger than 2,000,000 km²", (c) => c.area > 2e6],
      ["<1k", "smaller than 1,000 km²", (c) => c.area < 1000],
      ["<10k", "smaller than 10,000 km²", (c) => c.area < 1e4],
    ];
    for (const [k, phrase, f] of AREA) {
      add("area", k, `Pin a country ${phrase}.`, f, areaWhy, FACTS.area);
      for (const [r, subj] of regionEntries) add("area", `${k}/${r}`, `Pin ${subj} ${phrase}.`, (c) => c.region === r && f(c), areaWhy, FACTS.area);
    }
    const popWhy = (c) => `${c.name} has about ${fmtPop(c.pop)} people (World Bank, 2023).`;
    const POP = [
      [">100M", "with more than 100 million people", (c) => c.pop > 1e8],
      [">50M", "with more than 50 million people", (c) => c.pop > 5e7],
      ["<1M", "with fewer than 1 million people", (c) => c.pop < 1e6],
      ["<100k", "with fewer than 100,000 people", (c) => c.pop < 1e5],
    ];
    for (const [k, phrase, f] of POP) {
      add("pop", k, `Pin a country ${phrase}.`, f, popWhy, FACTS.pop, { note: "World Bank 2023 estimates." });
      for (const [r, subj] of regionEntries) add("pop", `${k}/${r}`, `Pin ${subj} ${phrase}.`, (c) => c.region === r && f(c), popWhy, FACTS.pop, { note: "World Bank 2023 estimates." });
    }

    // ---- Comparisons: bigger, smaller, more or fewer people than a given country ----
    const km = (c) => `${fmt(Math.round(c.area))} km²`;
    for (const x of COUNTRIES) {
      add("sizeVs", `>${x.id}`, `Pin a country that is larger than ${x.name}.`, (c) => c.area > x.area,
        (c) => `${c.name} covers ${km(c)}, more than ${x.name}'s ${km(x)}.`, FACTS.area, { topic: x.name });
      add("sizeVs", `<${x.id}`, `Pin a country that is smaller than ${x.name}.`, (c) => c.area < x.area,
        (c) => `${c.name} covers ${km(c)}, less than ${x.name}'s ${km(x)}.`, FACTS.area, { topic: x.name });
      add("popVs", `>${x.id}`, `Pin a country with more people than ${x.name}.`, (c) => c.pop > x.pop,
        (c) => `${c.name} has about ${fmtPop(c.pop)} people; ${x.name} has about ${fmtPop(x.pop)}.`, FACTS.pop, { note: "World Bank 2023 estimates.", topic: x.name });
      add("popVs", `<${x.id}`, `Pin a country with fewer people than ${x.name}.`, (c) => c.pop < x.pop,
        (c) => `${c.name} has about ${fmtPop(c.pop)} people; ${x.name} has about ${fmtPop(x.pop)}.`, FACTS.pop, { note: "World Bank 2023 estimates.", topic: x.name });
    }

    // ---- Neighbours that are bigger or smaller ----
    for (const x of COUNTRIES) {
      const nb = new Set(x.borders);
      add("neighbourSize", `big:${x.id}`, `Pin a neighbour of ${x.name} that is larger than it.`, (c) => nb.has(c.id) && c.area > x.area,
        (c) => `${c.name} borders ${x.name} and covers ${km(c)}, against ${x.name}'s ${km(x)}.`, FACTS.area, { note: "Land borders only.", topic: x.name });
      add("neighbourSize", `small:${x.id}`, `Pin a neighbour of ${x.name} that is smaller than it.`, (c) => nb.has(c.id) && c.area < x.area,
        (c) => `${c.name} borders ${x.name} and covers ${km(c)}, against ${x.name}'s ${km(x)}.`, FACTS.area, { note: "Land borders only.", topic: x.name });
      add("neighbourSize", `fewer:${x.id}`, `Pin a neighbour of ${x.name} with fewer people than it.`, (c) => nb.has(c.id) && c.pop < x.pop,
        (c) => `${c.name} borders ${x.name} and has about ${fmtPop(c.pop)} people, against ${fmtPop(x.pop)}.`, FACTS.pop, { note: "Land borders only. World Bank 2023 estimates.", topic: x.name });
      add("neighbourSize", `pop:${x.id}`, `Pin a neighbour of ${x.name} with more people than it.`, (c) => nb.has(c.id) && c.pop > x.pop,
        (c) => `${c.name} borders ${x.name} and has about ${fmtPop(c.pop)} people, against ${fmtPop(x.pop)}.`, FACTS.pop, { note: "Land borders only. World Bank 2023 estimates.", topic: x.name });
    }

    // ---- Two borders away: not a neighbour, but a neighbour's neighbour ----
    for (const x of COUNTRIES) {
      const near = new Set(x.borders);
      const via = (c) => c.borders.filter((b) => near.has(b));
      add("twoAway", x.id, `Pin a country that doesn't border ${x.name} but borders one of its neighbours.`,
        (c) => c.id !== x.id && !near.has(c.id) && via(c).length > 0,
        (c) => { const v = via(c).map((id) => BY_ID[id].name); const said = v.length > 1 ? `${v.slice(0, -1).join(", ")} and ${v[v.length - 1]}` : v[0];
          return `${c.name} doesn't touch ${x.name}, but it borders ${said}, which ${v.length > 1 ? "do" : "does"}.`; }, FACTS.borders,
        { note: "Land borders only.", topic: x.name });
    }

    // ---- Rankings: the biggest, most populous and smallest, worldwide and by region ----
    const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
    const ranked = (cs, key, desc) => [...cs].sort((a, b) => (desc ? b[key] - a[key] : a[key] - b[key]));
    const RANKS = [
      ["area", true, "largest countries by area", (c) => km(c)],
      ["pop", true, "most populous countries", (c) => `${fmtPop(c.pop)} people`],
      ["area", false, "smallest countries by area", (c) => km(c)],
      ["pop", false, "least populous countries", (c) => `${fmtPop(c.pop)} people`],
    ];
    const OWNER = { Americas: "the Americas'" };
    const scopes = [["world", "the world's", "in the world", COUNTRIES],
      ...Object.keys(REGIONS).map((r) => [r, OWNER[r] || `${r}'s`, `in ${REGION_NAME[r]}`, COUNTRIES.filter((c) => c.region === r)])];
    for (const [sk, owner, where, cs] of scopes)
      for (const [key, desc, what, show] of RANKS)
        for (const n of [5, 10, 20]) {
          if (cs.length < n * 2) continue;
          const order = ranked(cs, key, desc);
          const top = new Set(order.slice(0, n).map((c) => c.id));
          const one = what.replace("countries", "country").replace(" by area", "");
          add("rank", `${sk}:${key}:${desc ? "top" : "bottom"}${n}`, `Pin one of ${owner} ${n} ${what}.`, (c) => top.has(c.id),
            (c) => { const k = order.indexOf(c) + 1; return `${c.name} is the ${k === 1 ? "" : ord(k) + " "}${one} ${where}, with ${show(c)}.`; },
            key === "area" ? FACTS.area : FACTS.pop, { min: 3, note: key === "pop" ? "World Bank 2023 estimates." : "" });
        }

    // ---- Population density ----
    const dens = (c) => c.pop / c.area;
    const densWhy = (c) => `${c.name} has about ${fmt(Math.round(dens(c)))} people per km² (${fmtPop(c.pop)} people on ${km(c)}).`;
    const DENSITY = [
      [">500", "more than 500 people per km²", (c) => dens(c) > 500],
      [">300", "more than 300 people per km²", (c) => dens(c) > 300],
      [">150", "more than 150 people per km²", (c) => dens(c) > 150],
      ["<10", "fewer than 10 people per km²", (c) => dens(c) < 10],
      ["<25", "fewer than 25 people per km²", (c) => dens(c) < 25],
    ];
    for (const [k, phrase, f] of DENSITY) {
      add("density", k, `Pin a country with ${phrase}.`, f, densWhy, FACTS.pop, { note: "Population divided by land and water area; World Bank 2023 estimates." });
      for (const [r, subj] of regionEntries)
        add("density", `${k}/${r}`, `Pin ${subj} with ${phrase}.`, (c) => c.region === r && f(c), densWhy, FACTS.pop, { note: "Population divided by total area; World Bank 2023 estimates." });
    }

    // ---- Exactly N neighbours ----
    for (const n of [2, 3, 4, 5]) {
      add("borderExact", `=${n}`, `Pin a country that borders exactly ${n} other countries.`, (c) => c.borders.length === n, nbWhy, FACTS.borders, { note: BORDER_NOTE });
      for (const [r, subj] of regionEntries)
        add("borderExact", `=${n}/${r}`, `Pin ${subj} that borders exactly ${n} other countries.`, (c) => c.region === r && c.borders.length === n, nbWhy, FACTS.borders, { note: BORDER_NOTE });
    }

    // ---- Regions mixed with coastlines, roads and languages ----
    for (const [sub, [subj, nm]] of Object.entries(SUBREGIONS)) {
      add("subMix", `ll/${sub}`, `Pin ${subj} that is landlocked.`, (c) => c.subregion === sub && c.landlocked, llWhy, FACTS.landlocked, { topic: nm });
      add("subMix", `coast/${sub}`, `Pin ${subj} with a coastline.`, (c) => c.subregion === sub && !c.landlocked,
        (c) => `${c.name} is in ${nm} and has a coastline.`, FACTS.landlocked, { topic: nm });
      add("subMix", `isl/${sub}`, `Pin ${subj} with no land borders.`, (c) => c.subregion === sub && !c.borders.length, islWhy, FACTS.borders, { topic: nm });
      add("subMix", `left/${sub}`, `Pin ${subj} where people drive on the left.`, (c) => c.subregion === sub && c.drive === "left", dWhy, FACTS.drive, { topic: nm });
      for (const l of ["English", "French", "Spanish", "Arabic", "Portuguese"])
        add("langSub", `${l}/${sub}`, `Pin ${subj} where ${l} is an official language.`, (c) => c.subregion === sub && c.languages.includes(l), langWhy(l), FACTS.lang,
          { note: LANG_NOTE, topic: `${l} language` });
    }

    // ---- Money and capitals by region ----
    for (const [key, phrase, re] of CURRENCY) {
      const m = (x) => re.test(strip(x).toLowerCase());
      for (const [r, subj] of regionEntries)
        add("currencyRegion", `${key}/${r}`, `Pin ${subj} that uses ${phrase}.`, (c) => c.region === r && c.currencies.some(m),
          (c) => `${c.name} uses the ${c.currencies.filter(m).join(" and the ")}.`, FACTS.currency,
          { note: "Counts every official currency, including a foreign one a country has adopted." });
    }
    for (const L of ALPHA)
      for (const [r, subj] of regionEntries)
        add("capRegion", `${L}/${r}`, `Pin ${subj} whose capital starts with ${L}.`, (c) => c.region === r && c.capitals.some((k) => letters(k)[0] === L),
          (c) => `The capital of ${c.name} is ${c.capitals.find((k) => letters(k)[0] === L)}.`, FACTS.capital,
          { note: "Countries with more than one capital count if any of them fits." });

    // Trivia sets: rivers, seas, mountains, animals, crops, landmarks, sport, science...
    for (const set of FACT_SETS) {
      const ids = Object.keys(set.answers);
      if (ids.length < 2) continue;
      pool.push({
        id: `${set.family}:${set.id}`,
        family: set.family,
        text: set.text,
        answers: ids.filter((id) => BY_ID[id]),
        why: (c) => sentence(set, set.answers[c.id]),
        fact: (c) => {
          const t = TRIVIA_BY_COUNTRY[c.id]?.find((x) => x.family === set.family);
          return t ? `Related: ${t.text.replace(/\.$/, "")}` : "It isn't on this list";
        },
        note: set.source ? `Source: ${set.source}.` : "",
        topic: set.topic || null,
        source: set.source || "",
      });
    }

    for (const p of pool) p.tiers = rankAnswers(p.answers);
    return pool;
  }

  const POOL = buildPool();
  const BY_PROMPT = Object.fromEntries(POOL.map((p) => [p.id, p]));
  const FAMILIES = {};
  for (const p of POOL) (FAMILIES[p.family] = FAMILIES[p.family] || []).push(p);

  // ---------- randomness ----------
  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function seededRng(seed) {
    let a = hash(String(seed));
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickFamily(rng, exclude) {
    const fams = Object.keys(FAMILIES).filter((f) => !exclude.has(f));
    const total = fams.reduce((s, f) => s + (FAMILY_WEIGHTS[f] || 1), 0);
    let r = rng() * total;
    for (const f of fams) {
      r -= FAMILY_WEIGHTS[f] || 1;
      if (r <= 0) return f;
    }
    return fams[fams.length - 1];
  }

  // Similar families feel alike; allow at most one of each group per set of five.
  const GROUP = {
    starts: "letter", regionStarts: "letter", capStarts: "letter", ends: "letter", nameLen: "letter", contains: "letter", nameMisc: "letter",
    lang: "lang", langRegion: "lang", border: "border", borderPair: "border", borderCount: "border",
    landlocked: "coast", island: "coast", sea: "coast", area: "size", pop: "size",
    crops: "produce", resources: "produce", mountains: "terrain", desert: "terrain", nature: "terrain",
    origins: "origins", food: "origins", river: "water", lakes: "water", politics: "politics", flags: "politics",
    sizeVs: "size", popVs: "size", neighbourSize: "size", rank: "size", density: "size", twoAway: "border", borderExact: "border",
    subMix: "coast", langSub: "lang", capRegion: "letter", currencyRegion: "money", currency: "money",
  };

  // Draw `n` prompts from different families, skipping ids in `avoid` when possible.
  function drawPrompts(rng, n, avoid = new Set()) {
    const out = [];
    const usedFamilies = new Set();
    while (out.length < n) {
      if (usedFamilies.size >= Object.keys(FAMILIES).length) usedFamilies.clear();
      const fam = pickFamily(rng, usedFamilies);
      const group = GROUP[fam];
      if (group) for (const [f, g] of Object.entries(GROUP)) if (g === group) usedFamilies.add(f);
      usedFamilies.add(fam);
      const options = FAMILIES[fam].filter((p) => !avoid.has(p.id) && !out.includes(p));
      const choices = options.length ? options : FAMILIES[fam].filter((p) => !out.includes(p));
      if (!choices.length) continue;
      out.push(choices[Math.floor(rng() * choices.length)]);
    }
    return out;
  }

  // ---------- daily ----------
  const EPOCH = Date.UTC(2026, 10, 11); // Daily #1 = 11 Nov 2026
  const localDateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function dailyNumber(key) {
    const [y, m, d] = key.split("-").map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1;
  }
  const dailyPrompts = (key) => drawPrompts(seededRng(`longshot-daily-v2-${key}`), 5);

  function judge(prompt, countryId) {
    const tier = prompt.tiers[countryId];
    if (tier === undefined) return { correct: false, tier: null, points: 0 };
    return { correct: true, tier, points: TIERS[tier].points };
  }

  function answersByTier(prompt) {
    const groups = TIERS.map(() => []);
    for (const id of prompt.answers) groups[prompt.tiers[id]].push(id);
    for (const g of groups) g.sort((a, b) => BY_ID[a].name.localeCompare(BY_ID[b].name));
    return groups;
  }

  // Explain any country against a prompt: why it counts, or what's true instead.
  function explain(prompt, countryId) {
    const c = BY_ID[countryId];
    const tier = prompt.tiers[countryId];
    if (tier !== undefined) return { correct: true, tier, text: prompt.why(c) };
    return { correct: false, tier: null, text: `${c.name} doesn't fit. ${prompt.fact(c)}.`.replace(/\.\.$/, ".") };
  }

  // ---------- country profile ("learn more") ----------
  const WIKI_TITLE = {
    GEO: "Georgia (country)", COD: "Democratic Republic of the Congo", COG: "Republic of the Congo", FSM: "Federated States of Micronesia",
    PSE: "State of Palestine", TLS: "East Timor", TUR: "Turkey", IRL: "Republic of Ireland", CIV: "Ivory Coast", GMB: "The Gambia",
    BHS: "The Bahamas", CZE: "Czech Republic", USA: "United States", GBR: "United Kingdom", VAT: "Vatican City", UNK: "Kosovo",
  };
  const wikiTitle = (id) => WIKI_TITLE[id] || BY_ID[id].name;

  function profile(countryId) {
    const c = BY_ID[countryId];
    const rows = [
      ["Capital", c.capitals.join(" / ") || "none"],
      ["Population", `${fmtPop(c.pop)} (2023)`],
      ["Area", `${fmt(Math.round(c.area))} km²`],
      ["Region", c.subregion || c.region],
      ["Languages", c.languages.join(", ")],
      ["Currency", c.currencies.join(", ")],
      ["Neighbours", c.borders.length ? list(c.borders) : "none (no land borders)"],
      ["Drives on the", c.drive],
    ];
    return { country: c, rows, trivia: TRIVIA_BY_COUNTRY[c.id] || [], wiki: wikiTitle(c.id) };
  }

  const api = {
    COUNTRIES, BY_ID, TIERS, POOL, BY_PROMPT, FAMILIES, FAMILY_LABEL, FACTS, FACT_SETS,
    seededRng, drawPrompts, dailyPrompts, dailyNumber, localDateKey, judge, answersByTier, explain, profile, fame, fmtPop, letters,
  };
  root.Engine = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
