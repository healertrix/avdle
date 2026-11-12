// "Who lived here?" engine: famous people shown by where they were born and died.
// Shared by the browser and the server (the server judges guesses in rooms).
// The list itself is data/people.js (built from Wikidata by tools/build-people.mjs),
// loaded only when this mode is played.
(function (root) {
  "use strict";

  const TIERS = [
    { key: "household", label: "Household name", points: 100, emoji: "🟩" },
    { key: "famous", label: "Famous", points: 250, emoji: "🟦" },
    { key: "known", label: "Well known", points: 450, emoji: "🟪" },
    { key: "deep", label: "Deep cut", points: 700, emoji: "🟧" },
    { key: "scholar", label: "Scholar level", points: 1000, emoji: "🟥" },
  ];
  // Fame = number of Wikipedia language editions with an article about them.
  const tierOf = (p) => (p.fame >= 160 ? 0 : p.fame >= 120 ? 1 : p.fame >= 95 ? 2 : p.fame >= 80 ? 3 : 4);
  const HINT_FACTOR = 0.5;

  let LIST = null;
  let BY_ID = {};
  let SURNAME_OWNER = {}; // surname -> id of the most famous person with it

  // ---------- names ----------
  const STOP = new Set(["the", "of", "de", "da", "do", "dos", "das", "di", "du", "del", "della", "der", "den", "van", "von", "la", "le", "al", "el", "ibn", "bin", "y", "and", "jr", "sr", "st", "saint", "sir", "lord", "dr", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv", "xvi"]);
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/ß/g, "ss")
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const tokens = (s) => norm(s).split(" ").filter((t) => t && !STOP.has(t));
  const key = (s) => tokens(s).join(" ");
  // "William Thomson, 1st Baron Kelvin" -> also "William Thomson" and "Kelvin"
  const parts = (s) => [s, ...String(s).split(/,|\(|\)/).map((x) => x.replace(/^\s*\d+(st|nd|rd|th)\s+\w+\s+/i, "").trim())].filter(Boolean);
  const surname = (p) => {
    const t = tokens(p.name.split(",")[0]);
    return t.length > 1 ? t[t.length - 1] : null;
  };
  function candidates(p) {
    if (p._cands) return p._cands;
    const set = new Set();
    for (const n of [p.name, ...p.aka]) for (const x of parts(n)) {
      const k = key(x);
      if (k.length >= 3) set.add(k);
    }
    return (p._cands = [...set]);
  }

  function lev(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 3;
    // edit distance where swapping two neighbouring letters ("einstien") counts as one typo
    let pp = null, prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (pp && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1);
      }
      pp = prev;
      prev = cur;
    }
    return prev[b.length];
  }
  const slack = (s) => (s.length <= 4 ? 0 : s.length <= 8 ? 1 : 2);
  const near = (a, b) => lev(a, b) <= Math.min(slack(a), slack(b));

  // Is `guess` this person? Full name, a known alias, or the surname alone when
  // nobody more famous shares it (so "Gandhi" means Mahatma, Indira needs her first name).
  function match(p, guess) {
    const g = key(guess);
    if (g.length < 3) return false;
    const cands = candidates(p);
    if (cands.some((c) => c === g || near(c, g))) return true;
    const gt = g.split(" ");
    const s = surname(p);
    if (s && s.length >= 4 && gt.length === 1 && near(s, gt[0]) && SURNAME_OWNER[s] === p.id) return true;
    // "Mozart", "Wolfgang Mozart", "Amadeus Mozart": every typed word is in the name, surname included
    const nameT = tokens(p.name);
    if (s && gt.length >= 2 && gt.includes(s) && gt.every((t) => nameT.some((n) => near(n, t)))) return true;
    return false;
  }

  function judge(p, guess, hinted) {
    if (!p || !match(p, guess)) return { correct: false, tier: tierOf(p), points: 0 };
    const t = tierOf(p);
    return { correct: true, tier: t, points: Math.round(TIERS[t].points * (hinted ? HINT_FACTOR : 1)) };
  }

  // ---------- drawing a game ----------
  // Difficulty levels, as the fame tier for each of five people.
  //   rising: two household names, then famous, well known, and a deep cut (sometimes a scholar-level one)
  const LEVELS = ["rising", "veryeasy", "easy", "medium", "hard"];
  // -1 = "very easy": only the most famous people of all (about the top 100 by Wikipedia languages)
  const VERY_FAMOUS = 200;
  const LEVEL_PLAN = { rising: [0, 0, 1, 2, 3], veryeasy: [-1, -1, -1, -1, -1], easy: [0, 0, 0, 1, 1], medium: [1, 1, 2, 2, 2], hard: [3, 3, 3, 4, 4] };
  const inTier = (p, t) => (t < 0 ? p.fame >= VERY_FAMOUS : tierOf(p) === t);
  function draw(rng, n = 5, avoid = new Set(), level = "rising") {
    const base = LEVEL_PLAN[level] || LEVEL_PLAN.rising;
    const plan = Array.from({ length: n }, (_, i) => base[Math.min(base.length - 1, Math.floor((i * base.length) / n))]);
    if (level === "rising" && n >= 3 && rng() < 0.25) plan[n - 1] = 4;
    const out = [];
    const used = new Set();
    for (const t of plan) {
      let opts = LIST.filter((p) => inTier(p, t) && !avoid.has(p.id) && !used.has(p.id));
      if (!opts.length) opts = LIST.filter((p) => inTier(p, t) && !used.has(p.id));
      // avoid two people born in the same country in one game when we can
      const fresh = opts.filter((p) => !out.some((o) => o.born.c === p.born.c));
      const pool = fresh.length ? fresh : opts;
      const pick = pool[Math.floor(rng() * pool.length)];
      out.push(pick);
      used.add(pick.id);
    }
    return out;
  }

  // ---------- formatting ----------
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yearText = (y) => (y <= 0 ? `${1 - y} BC` : y < 1000 ? `AD ${y}` : String(y));
  const dateText = (e) => (e.d ? `${e.d} ${MONTHS[e.m - 1]} ${yearText(e.y)}` : e.m ? `${MONTHS[e.m - 1]} ${yearText(e.y)}` : yearText(e.y));
  function age(p) {
    const b = p.born, d = p.died;
    let a = d.y - b.y; // years are stored in astronomical numbering (1 BC = 0), so this is exact
    if (b.m && d.m && (d.m < b.m || (d.m === b.m && b.d && d.d && d.d < b.d))) a--;
    return a;
  }
  // What a player sees before guessing (also what the server sends in rooms):
  // dates and map points only. Place names can give the person away ("Gandhi Smriti").
  const strip = ({ y, m, d, at }) => ({ y, m, d, at });
  const clue = (p) => ({ born: strip(p.born), died: strip(p.died) });
  // "What they did", with their own name blanked out.
  function hint(p) {
    let d = p.desc || "No description on record.";
    for (const t of tokens(p.name)) if (t.length >= 4) d = d.replace(new RegExp(`\b${t}\w*`, "gi"), "…");
    return d.charAt(0).toUpperCase() + d.slice(1);
  }
  const photo = (p, w = 400) => (p.img ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.img)}?width=${w}` : null);

  function init(list) {
    LIST = list;
    BY_ID = Object.fromEntries(list.map((p) => [p.id, p]));
    SURNAME_OWNER = {};
    for (const p of list) {
      const s = surname(p);
      if (s && !(s in SURNAME_OWNER)) SURNAME_OWNER[s] = p.id; // list is sorted by fame
    }
    api.LIST = LIST;
    api.BY_ID = BY_ID;
    return api;
  }

  const api = { TIERS, LEVELS, tierOf, match, judge, draw, dateText, yearText, age, clue, hint, photo, init, norm, LIST: null, BY_ID: null };
  if (root.PEOPLE) init(root.PEOPLE);
  else if (typeof require !== "undefined" && typeof module !== "undefined") init(require("../data/people.js"));
  root.People = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
