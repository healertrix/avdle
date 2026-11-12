// Warpath engine: guess the year of a moment from history.
// Shared by the browser and the server (the server judges guesses in war rooms).
// The moments are in data/events.js.
(function (root) {
  "use strict";

  const RAW = root.EVENTS || (typeof require !== "undefined" ? require("../data/events.js") : []);
  const LIST = RAW.map(([y, fame, cat, text, fact], id) => ({ id, y, fame, cat, text, fact }));
  const NOW = 2026;
  const MIN_YEAR = -3500;
  const MAX_YEAR = NOW;

  // Years: negative = BC, no year 0. "ast" is astronomical numbering (1 BC = 0), so differences are exact.
  const ast = (y) => (y < 0 ? y + 1 : y);
  const fromAst = (a) => (a <= 0 ? a - 1 : a);
  const yearsOff = (a, b) => Math.abs(ast(a) - ast(b));
  const yearText = (y) => (y < 0 ? `${-y} BC` : y < 1000 ? `AD ${y}` : String(y));
  const isYear = (y) => Number.isInteger(y) && y !== 0 && y >= MIN_YEAR && y <= MAX_YEAR;

  // How close counts as close depends on how long ago it was: within 3 years of the iPhone is
  // as hard as within about 25 years of the pyramids.
  function bands(y) {
    const age = Math.max(1, NOW - ast(y));
    const close = Math.max(1, Math.round(0.55 * Math.sqrt(age)));
    return { close, near: Math.max(close + 1, Math.round(close * 2.5)), rough: Math.max(close + 2, Math.round(close * 6)) };
  }

  const TIERS = [
    { key: "slain", label: "Dragonslayer", what: "Exact year", points: 1000, emoji: "🟥" },
    { key: "victory", label: "Victory", what: "Close", points: 700, emoji: "🟧" },
    { key: "hard", label: "Hard-won", what: "Near", points: 450, emoji: "🟨" },
    { key: "escaped", label: "It got away", what: "Rough", points: 250, emoji: "🟩" },
    { key: "felled", label: "Felled", what: "Way off", points: 100, emoji: "⬜" },
    { key: "lost", label: "Lost in time", what: "No answer", points: 0, emoji: "⬛" },
  ];

  // Harder (less famous) moments are worth more.
  const MULT = [1, 1, 1.25, 1.5, 1.75, 2];
  const multOf = (ev) => MULT[ev.fame] || 1;
  const maxPoints = (ev) => Math.round(1000 * multOf(ev));
  // A monument piece: the exact year, or close on a hard moment (fame 4-5).
  const monumentHit = (tier, ev) => tier === 0 || (tier === 1 && ev.fame >= 4);

  function judge(ev, guess) {
    const mult = multOf(ev);
    if (!isYear(guess)) return { tier: 5, points: 0, off: null, mult, max: maxPoints(ev), monument: false };
    const off = yearsOff(guess, ev.y);
    const b = bands(ev.y);
    const tier = off === 0 ? 0 : off <= b.close ? 1 : off <= b.near ? 2 : off <= b.rough ? 3 : 4;
    return { tier, points: Math.round(TIERS[tier].points * mult), off, mult, max: maxPoints(ev), monument: monumentHit(tier, ev) };
  }

  // Difficulty 1 (recruit) .. 5 (legend): mostly moments of that fame, a few either side.
  const LEVELS = [1, 2, 3, 4, 5];
  const LEVEL_NAMES = ["", "Recruit", "Soldier", "Centurion", "Champion", "Legend"];
  const ERA = (y) => (y < 500 ? 0 : y < 1450 ? 1 : y < 1750 ? 2 : y < 1900 ? 3 : y < 1990 ? 4 : 5);

  function draw(rng, n = 7, level = 2, avoid = new Set()) {
    level = LEVELS.includes(level) ? level : 2;
    const weight = (e) => {
      const w = Math.max(0, 3 - Math.abs(e.fame - level));
      return w * w;
    };
    const out = [];
    const catCount = {};
    const eraCount = {};
    const years = new Set();
    const capCat = Math.max(1, Math.ceil(n / 4));
    const capEra = Math.max(1, Math.ceil(n / 3));
    for (let pass = 0; pass < 3 && out.length < n; pass++) {
      // pass 0 keeps variety strict, later passes relax it so a game can always be filled
      while (out.length < n) {
        const pool = LIST.filter(
          (e) =>
            weight(e) > 0 &&
            !out.includes(e) &&
            (pass > 1 || !avoid.has(e.id)) &&
            (pass > 0 || ((catCount[e.cat] || 0) < capCat && (eraCount[ERA(e.y)] || 0) < capEra && !years.has(e.y)))
        );
        if (!pool.length) break;
        let total = 0;
        for (const e of pool) total += weight(e);
        let r = rng() * total;
        let pick = pool[pool.length - 1];
        for (const e of pool) if ((r -= weight(e)) <= 0) { pick = e; break; }
        out.push(pick);
        catCount[pick.cat] = (catCount[pick.cat] || 0) + 1;
        eraCount[ERA(pick.y)] = (eraCount[ERA(pick.y)] || 0) + 1;
        years.add(pick.y);
      }
    }
    return out;
  }

  const CATS = {
    war: "War & battle", power: "Empires & rulers", explore: "Exploration", politics: "Politics", india: "India",
    science: "Science & invention", space: "Space", culture: "Art & culture", film: "Film", music: "Music",
    sport: "Sport", disaster: "Disaster", tech: "Tech & games",
  };
  // What a player sees before guessing (also what the server sends in rooms): never the year.
  const clue = (e) => ({ text: e.text, cat: e.cat, fame: e.fame });
  // The fact line usually starts with the year; drop that so the reveal doesn't repeat it.
  const factText = (e) => String(e.fact || "").replace(/^(c\.\s*)?(AD\s*)?\d+(\s*(BC|AD))?[.:]?\s*/, (m) => (/^c\./.test(m) ? "Approximate date. " : "")).trim();

  // Campaigns (the empire you march for). The art and maps are in js/warpath-empires.js.
  const EMPIRES = ["maurya", "gupta", "chola", "mughal", "maratha", "macedon", "persia", "rome", "mongol", "ottoman", "japan", "napoleon", "inca"];

  const api = { EMPIRES, MULT, multOf, maxPoints, monumentHit, LIST, NOW, MIN_YEAR, MAX_YEAR, TIERS, LEVELS, LEVEL_NAMES, CATS, ast, fromAst, yearsOff, yearText, isYear, bands, judge, draw, clue, factText };
  root.Warpath = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
