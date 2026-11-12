// Warpath: guess the year of a moment from history.
// Pick an empire, then march your dot-matrix warrior along its road. Every moment puts one of the
// empire's real enemies (or a beast) in the way; the closer your year, the more spectacular the win.
// Exact years, or close calls on hard moments, raise the empire's great monument piece by piece.
(function () {
  "use strict";
  const W = window.Warpath;
  const EMP = window.WarpathEmpires;
  const $ = (s, r = document) => r.querySelector(s);
  const root = $("#warpath");
  if (!W || !EMP || !root) return;
  const cv = $("#wpCanvas");
  const ctx = cv.getContext("2d");
  const panel = $("#wpPanel");
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("warpath." + k);
        return v == null ? d : JSON.parse(v);
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("warpath." + k, JSON.stringify(v));
      } catch {}
    },
  };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const fmt = (n) => Math.round(n).toLocaleString("en");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hash = (s) => {
    let h = 2166136261;
    for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const MONUMENT_STAGES = 5;

  // =====================================================================
  // Palette (LED colours)
  // =====================================================================
  const C = {
    grid: "#141922", sea: "#0f2638", seaHi: "#173a55", land: "#2b2a24", coast: "#4a4535",
    route: "#4d3a17", routeHi: "#ffcf5a", city: "#ffe9a8",
    visor: "#3a2a10", skin: "#e8a878", leather: "#a8642a", legs: "#e8a878", shield: "#d08a2a", sword: "#f4f7ff", hilt: "#ffcf5a",
    white: "#ffffff", gold: "#ffd34d", ember: "#ff8a1a", fire: "#ffb000", red: "#ff3b2f", blood: "#c81e1e", dust: "#8a7a5a", fog: "#5a6478",
    star: "#3a4458", hill: "#1e2430", ground: "#3a3020", ghost: "#1d222c",
    dragon: "#e8342a", dragonWing: "#8e1c16", eye: "#ffe84a", tooth: "#ffffff", claw: "#ffd34d",
    tiger: "#ff8a1a", stripe: "#2a1406", jaguar: "#e8b03a", elephant: "#9aa6b4", tusk: "#fff6dc", wolf: "#b8c4d4", boar: "#a8703a",
    goat: "#d8d0c0", horn: "#8a7a5a", hoof: "#3a2a18", wood: "#8a5a2a", steel: "#d8dce6",
  };

  // =====================================================================
  // Sprites. One character per dot ("." = empty). Your warrior faces right; foes face left.
  // =====================================================================
  function compile(rows, key) {
    const out = [];
    const w = Math.max(...rows.map((r) => r.length));
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = key[row[x]];
        if (row[x] !== "." && c) out.push({ x, y, c });
      }
    });
    return { dots: out, w, h: rows.length };
  }

  // your warrior (faces right)
  const WAR_BODY = ["....rr...", "...rrrr..", "..hhhhh..", ".hhhhhhh.", ".hhhkkkh.", "..hhhhh..", "...sss...", ".aaaaaaa.", "aaaaaaaaa", ".aaaaaaa.", "..aaaaa..", ".bbbbbbb.", ".b.b.b.b."];
  const LEGS = [["..l...l..", "..l...l..", ".ll...ll."], ["...l.l...", "..l...l..", ".ll....ll"]];
  const HAND = [8, 8];
  const SHIELD_AT = [1, 9];
  let WARRIOR = null;
  function makeWarrior(colors) {
    const key = { r: colors.plume, h: colors.helm, k: C.visor, s: C.skin, a: colors.armor, b: C.leather, l: C.legs };
    WARRIOR = [0, 1].map((f) => compile([...WAR_BODY, ...LEGS[f]], key));
  }

  // enemy soldiers (face left): head variants + a shared body
  const HEADS = {
    crest: ["..rrrr...", "...rrrr..", "..hhhhh..", ".hhhhhhh.", ".hkkkhhh.", "..hhhhh.."],
    turban: ["..hhhh...", ".hhhhhh..", ".hhhhhh..", "..ssss...", ".essss...", "..sss...."],
    cone: ["....h....", "...hhh...", "..hhhhh..", "..ssss...", ".esss....", "..sss...."],
    cap: [".........", "..hhhh...", ".hhhhhh..", "..ssss...", ".esss....", "..sss...."],
    feather: ["..r.r.r..", "..rrrrr..", "..hhhhh..", "..ssss...", ".esss....", "..sss...."],
    hood: ["..hhhh...", ".hhhhhh..", ".hssssh..", ".essshh..", "..ssshh..", "..sss...."],
    bare: ["..hhhh...", ".hhhhhh..", ".hssss...", ".esss....", "..sss....", "..sss...."],
  };
  const FOE_BODY = ["...sss...", ".aaaaaaa.", "aaaaaaaaa", ".aaaaaaa.", "..aaaaa..", ".bbbbbbb.", ".b.b.b.b."];
  const HORSE = [
    [".HH.............", "HHHH............", "HEHH............", ".HHHHHHHHHHHHH..", "..HHHHHHHHHHHHHH", "..HHHHHHHHHHHH.H", "..H.H......H.H..", "..H.H......H.H..", "..K.K......K.K.."],
    [".HH.............", "HHHH............", "HEHH............", ".HHHHHHHHHHHHH..", "..HHHHHHHHHHHHHH", "..HHHHHHHHHHHH.H", "...H.H....H.H...", "..H...H..H...H..", "..K...K..K...K.."],
  ];
  function overlay(base, top, ox, oy) {
    const h = Math.max(base.length, top.length + oy);
    const w = Math.max(...base.map((r) => r.length), ...top.map((r) => r.length + ox));
    const grid = Array.from({ length: h }, (_, y) => [...(base[y] || "").padEnd(w, ".")]);
    top.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && (grid[y + oy][x + ox] = ch)));
    return grid.map((r) => r.join(""));
  }
  const soldierKey = (spec) => ({ r: spec.plume || spec.helm, h: spec.helm, k: C.visor, s: C.skin, e: "#1a1a1a", a: spec.armor, b: spec.skirt || C.leather, l: C.legs });
  function makeSoldier(spec) {
    const head = HEADS[spec.head] || HEADS.cap;
    const frames = [0, 1].map((f) => compile([...head, ...FOE_BODY, ...LEGS[f]], soldierKey(spec)));
    return { kind: "soldier", name: spec.name, frames, hand: [0, 8], shieldAt: [7, 9], weapon: spec.weapon, shield: spec.shield, shieldC: spec.shieldC || C.wood, big: !!spec.big, mouth: [1, 4] };
  }
  function makeRider(spec) {
    const rider = [...(HEADS[spec.head] || HEADS.cap), ...FOE_BODY.slice(0, 4)]; // head, neck, torso: 10 rows
    const key = { ...soldierKey(spec), H: spec.horse, E: "#1a1a1a", K: C.hoof };
    const frames = HORSE.map((hf) => compile(overlay([...Array(7).fill(""), ...hf], rider, 4, 0), key));
    return { kind: "cavalry", name: spec.name, frames, hand: [4, 8], shieldAt: null, weapon: spec.weapon, shield: null, big: !!spec.big, mouth: [0, 9] };
  }

  // beasts (face left)
  const BEAST_ART = {
    goat: {
      key: { h: "horn", g: "goat", e: "eye", b: "goat", k: "hoof", t: "goat" },
      frames: [
        ["hh..........", ".hh.........", ".gggg.......", "ggegg.......", "gg.ggggggggt", "b..gggggggg.", "...gggggggg.", "...g.g..g.g.", "...k.k..k.k."],
        ["hh..........", ".hh.........", ".gggg.......", "ggegg.......", "gg.ggggggggt", "b..gggggggg.", "...gggggggg.", "....g.gg.g..", "....k.kk.k.."],
      ],
      mouth: [0, 4],
    },
    boar: {
      key: { b: "boar", e: "eye", w: "tusk", k: "hoof", t: "boar" },
      frames: [
        ["...bbbb.......", ".bbbbbbbbbb...", "bebbbbbbbbbbb.", "wbbbbbbbbbbbbb", "w.bbbbbbbbbbbt", "..bbbbbbbbbb..", "..b.b....b.b..", "..k.k....k.k.."],
        ["...bbbb.......", ".bbbbbbbbbb...", "bebbbbbbbbbbb.", "wbbbbbbbbbbbbb", "w.bbbbbbbbbbbt", "..bbbbbbbbbb..", "...b.b..b.b...", "...k.k..k.k..."],
      ],
      mouth: [0, 3],
    },
    wolf: {
      key: { w: "wolf", e: "eye", t: "tooth" },
      frames: [
        [".w...........", "ww...........", "weww........w", "wwwwwwwwwwwww", "twwwwwwwwwww.", "..wwwwwwwwww.", "..w.w....w.w.", "..w.w....w.w."],
        [".w...........", "ww..........w", "weww.......w.", "wwwwwwwwwwww.", "twwwwwwwwwww.", "..wwwwwwwwww.", "...w.w..w.w..", "...w.w..w.w.."],
      ],
      mouth: [0, 4],
    },
    tiger: {
      key: { o: "tiger", e: "eye", k: "stripe", t: "tooth" },
      frames: [
        [".oo...............", "ooooo..............", "oeoooo..........o..", "oooooooooooooooo.o.", "tkoookookookoooo...", ".oooooooooooooo....", "..oo.oo....oo.oo...", "..oo.oo....oo.oo...", "..kk.kk....kk.kk..."],
        [".oo...............", "ooooo...........o..", "oeoooo.........o...", "oooooooooooooooo...", "tkoookookookoooo...", ".oooooooooooooo....", "...oo.oo..oo.oo....", "...oo.oo..oo.oo....", "...kk.kk..kk.kk...."],
      ],
      mouth: [0, 4],
    },
    elephant: {
      key: { g: "elephant", e: "eye", w: "tusk", y: "howdah", k: "hoof" },
      frames: [
        ["........yyyyy.....", "........y...y.....", "....ggggggggggg...", "..gggggggggggggg..", ".ggegggggggggggggg", "gggggggggggggggggg", "gwgggggggggggggggg", "gw.gggggggggggggg.", "g...gggggggggggg..", "g...gg.gg..gg.gg..", "g...gg.gg..gg.gg..", "....gg.gg..gg.gg..", "....kk.kk..kk.kk.."],
        ["........yyyyy.....", "........y...y.....", "....ggggggggggg...", "..gggggggggggggg..", ".ggegggggggggggggg", "gggggggggggggggggg", "gwgggggggggggggggg", ".w.gggggggggggggg.", ".g..gggggggggggg..", ".g...gg.gg.gg.gg..", "..g..gg.gg.gg.gg..", ".....gg.gg.gg.gg..", ".....kk.kk.kk.kk.."],
      ],
      mouth: [0, 6],
    },
    dragon: {
      key: { g: "dragon", h: "dragon", w: "dragonWing", e: "eye", f: "tooth", t: "dragon", c: "claw" },
      frames: [
        ["..............w.........", ".............ww....w....", "............www...ww....", "...........wwww..www....", "..........wwwwwwwwww....", "..hhh......wwwwwwww.....", ".hhhhh.....gggggggg.....", "hhehhhh..ggggggggggg....", "hhhhhhhhgggggggggggggg..", ".fhh..gggggggggggggggggt", "..f...ggggggggggggg...tt", ".......gg.gg...gg.gg..t.", ".......gg.gg...gg.gg....", "......ccc.cc..ccc.cc...."],
        ["........................", "........................", "........................", "........................", "..........wwwwwwwwwww...", "..hhh.....wwwwwwwwwwww..", ".hhhhh.....ggggggggwwwww", "hhehhhh..ggggggggggg..ww", "hhhhhhhhgggggggggggggg..", ".fhh..gggggggggggggggggt", "..f...ggggggggggggg...tt", ".......gg.gg...gg.gg..t.", ".......gg.gg...gg.gg....", "......ccc.cc..ccc.cc...."],
      ],
      mouth: [0, 9],
    },
  };
  function makeBeast(kind, name, recolor = {}) {
    const art = BEAST_ART[kind];
    const key = {};
    for (const [ch, col] of Object.entries(art.key)) key[ch] = recolor[col] || C[col] || col;
    return { kind: "beast", beast: kind, name, frames: art.frames.map((f) => compile(f, key)), mouth: art.mouth, dragon: kind === "dragon" };
  }
  const foeCache = new Map();
  function foeFrom(spec) {
    if (foeCache.has(spec)) return foeCache.get(spec);
    let f;
    if (spec.type === "elephant") f = { ...makeBeast("elephant", spec.name, { howdah: spec.howdah }), kind: "elephant" };
    else if (spec.type === "cavalry") f = makeRider(spec);
    else f = makeSoldier(spec);
    foeCache.set(spec, f);
    return f;
  }
  // Another player's warrior, in their empire's colours, turned to face you.
  function rivalFoe(player) {
    const emp = EMP[player.empire] || EMP.maurya;
    const c = emp.warrior;
    const key = { r: c.plume, h: c.helm, k: C.visor, s: C.skin, a: c.armor, b: C.leather, l: C.legs };
    const mirror = (rows) => rows.map((r) => [...r.padEnd(9, ".")].reverse().join(""));
    const frames = [0, 1].map((f) => compile(mirror([...WAR_BODY, ...LEGS[f]]), key));
    return { kind: "soldier", name: `${player.name}'s ${emp.name.replace(/ Empire$/, "")} warrior`, frames, hand: [0, 8], shieldAt: [7, 9], weapon: "sword", shield: "round", shieldC: c.armor, mouth: [1, 4], rival: player.id };
  }
  // In a war room with others, your rival for a round: the best of the others (or the first one before the round).
  function rivalOf(list, myId) {
    const others = (list || []).filter((p) => p.id !== myId);
    if (!others.length) return null;
    return others.slice().sort((a, b) => (b.points || 0) - (a.points || 0))[0];
  }
  const roomPlayers = () => (MP.room ? MP.room.players : []);
  const pvp = () => G.mode === "room" && roomPlayers().length > 1;

  // Which foe blocks the road for this moment (the same for everyone in a room).
  function pickFoe(empKey, ev, i, n) {
    const emp = EMP[empKey];
    const rng = seeded(hash(`${empKey}|${ev.text}|${i}`));
    if (n === Infinity ? i % LAP === LAP - 1 : i === n - 1) return { ...foeFrom(emp.boss), boss: true };
    if (ev.fame >= 5) return makeBeast("dragon", "dragon of legend");
    if (rng() < 0.3) {
      if (ev.fame <= 1) return makeBeast("goat", "mountain goat");
      if (ev.fame === 2) return makeBeast("boar", "wild boar");
      if (ev.fame === 3) return makeBeast("wolf", "wolf pack leader");
      return empKey === "inca" ? makeBeast("tiger", "jaguar", { tiger: C.jaguar }) : makeBeast("tiger", "tiger");
    }
    const idx = clamp(ev.fame - 1 - (rng() < 0.4 ? 1 : 0), 0, emp.enemies.length - 1);
    return foeFrom(emp.enemies[idx]);
  }

  // 5x7 dot-matrix font
  const FONT = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
    4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
    8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    " ": [0, 0, 0, 0, 0, 0, 0], "!": [4, 4, 4, 4, 4, 0, 4], "-": [0, 0, 0, 31, 0, 0, 0], ".": [0, 0, 0, 0, 0, 12, 12],
    "'": [4, 4, 8, 0, 0, 0, 0], "+": [0, 4, 4, 31, 4, 4, 0], ":": [0, 12, 12, 0, 12, 12, 0], "?": [14, 17, 1, 2, 4, 0, 4], "/": [1, 1, 2, 4, 8, 16, 16],
  };
  const textCache = new Map();
  function textDots(str) {
    str = String(str).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
    if (textCache.has(str)) return textCache.get(str);
    const dots = [];
    [...str].forEach((ch, i) => {
      const g = FONT[ch] || FONT[" "];
      g.forEach((row, y) => {
        for (let x = 0; x < 5; x++) if (row & (16 >> x)) dots.push([i * 6 + x, y]);
      });
    });
    const t = { dots, w: str.length * 6 - 1, h: 7 };
    textCache.set(str, t);
    return t;
  }

  // =====================================================================
  // Monuments: built bottom-up, one fifth per exact answer (or a close one on a hard moment)
  // =====================================================================
  function monument(kind) {
    const dots = new Map();
    const put = (x, y, c) => dots.set(x + "," + y, { x, y, c });
    const rect = (x0, y0, w, h, c) => {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, typeof c === "function" ? c(x, y) : c);
    };
    const dome = (cx, cy, r, c) => {
      for (let y = Math.ceil(cy - r); y <= cy; y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, c);
    };
    const hole = (x0, y0, w, h, c = "#2a2620") => rect(x0, y0, w, h, c);
    let w = 0;
    let h = 0;
    if (kind === "pillar") {
      // Ashoka's pillar with its lion capital
      w = 13; h = 34;
      rect(2, 32, 9, 2, "#a08a5a");
      rect(5, 10, 3, 22, (x) => (x === 5 ? "#fff0c8" : "#f0d8a0"));
      rect(4, 9, 5, 1, "#e8c07a"); rect(3, 7, 7, 2, "#e8c07a");
      rect(2, 6, 9, 1, "#c8a060"); put(6, 6, "#3a2a10");
      rect(2, 2, 3, 4, "#ffd34d"); rect(5, 1, 3, 5, "#ffe48a"); rect(8, 2, 3, 4, "#ffd34d");
      put(2, 1, "#ffd34d"); put(10, 1, "#ffd34d"); put(6, 0, "#ffe48a");
    } else if (kind === "ironpillar") {
      w = 11; h = 32;
      rect(1, 30, 9, 2, "#6a6a6a");
      rect(4, 9, 3, 21, (x) => (x === 4 ? "#b4c0cc" : "#8a96a6"));
      rect(3, 6, 5, 3, "#9aa6b4"); rect(2, 5, 7, 1, "#8a96a6");
      rect(4, 2, 3, 3, "#b4c0cc"); put(5, 1, "#ffd34d"); put(5, 0, "#ffd34d");
    } else if (kind === "temple") {
      // Brihadeeswarar: a stepped vimana tower
      w = 29; h = 34;
      rect(0, 31, 29, 3, "#b89a6a");
      rect(3, 24, 23, 7, "#c8a870"); hole(13, 26, 3, 5);
      for (let t = 0; t < 10; t++) {
        const tw = 21 - 2 * t;
        rect(Math.round((29 - tw) / 2), 22 - 2 * t, tw, 2, t % 2 ? "#c8a870" : "#d8c08a");
      }
      dome(14, 4, 3.2, "#e8d0a0");
      put(14, 0, "#ffd34d");
    } else if (kind === "taj") {
      w = 37; h = 30;
      rect(0, 27, 37, 3, "#e8e4dc");
      rect(10, 15, 17, 12, "#f4f1ea"); hole(16, 18, 5, 9, "#8a8a9a"); put(18, 17, "#8a8a9a");
      rect(13, 11, 11, 4, "#f4f1ea");
      dome(18.5, 11, 6.2, "#ffffff");
      put(18, 3, "#ffd34d"); put(18, 2, "#ffd34d"); put(18, 1, "#ffd34d");
      dome(12, 14, 1.8, "#f4f1ea"); dome(25, 14, 1.8, "#f4f1ea");
      rect(1, 10, 2, 17, "#f4f1ea"); rect(34, 10, 2, 17, "#f4f1ea");
      dome(2, 9, 1.5, "#ffffff"); dome(35, 9, 1.5, "#ffffff");
    } else if (kind === "fort") {
      // Raigad: walls and bastions on a hill, with the saffron flag
      w = 36; h = 26;
      for (let x = 0; x < 36; x++) {
        const hh = Math.round(10 + 3 * Math.sin(x / 4) + (x > 4 && x < 31 ? 3 : 0));
        rect(x, 26 - hh, 1, hh, (xx, y) => ((xx + y) % 3 ? "#4a5a2a" : "#3a4a20"));
      }
      rect(4, 8, 28, 5, "#a89a7a");
      for (let x = 4; x < 32; x += 2) put(x, 7, "#a89a7a");
      rect(3, 4, 5, 9, "#b8aa8a"); rect(28, 4, 5, 9, "#b8aa8a");
      for (const x of [3, 5, 7, 28, 30, 32]) put(x, 3, "#b8aa8a");
      hole(16, 10, 4, 3);
      rect(18, 0, 1, 7, "#8a6a4a");
      for (let y = 0; y < 4; y++) for (let x = 19; x < 24 - y; x++) put(x, y, "#ff8a1a");
    } else if (kind === "colosseum") {
      w = 38; h = 20;
      for (let t = 0; t < 4; t++) {
        const y0 = t * 5;
        const maxX = t === 0 ? 30 : t === 1 ? 34 : 38;
        rect(0, y0, maxX, 5, "#e0cfa8");
        if (t > 0) for (let x = 1; x < maxX - 1; x += 4) hole(x, y0 + 1, 2, 3, "#5a4a3a");
        else for (let x = 2; x < maxX - 1; x += 4) put(x, y0 + 2, "#5a4a3a");
      }
    } else if (kind === "mosque") {
      // Süleymaniye: great dome, half domes and four minarets
      w = 40; h = 34;
      rect(4, 26, 32, 8, "#d8dce6");
      for (let x = 7; x < 34; x += 4) hole(x, 28, 2, 3, "#4a5060");
      rect(12, 18, 16, 8, "#d8dce6");
      dome(20, 18, 8.5, "#e8ecf2");
      dome(10, 23, 5, "#c8ccd6"); dome(30, 23, 5, "#c8ccd6");
      put(20, 8, "#ffd34d"); put(20, 7, "#ffd34d"); put(21, 6, "#ffd34d"); put(19, 6, "#ffd34d");
      for (const [x, hh] of [[1, 30], [6, 24], [33, 24], [38, 30]]) {
        rect(x, 34 - hh, 1, hh, "#e8ecf2");
        put(x, 33 - hh, "#8a96a6"); put(x, 32 - hh, "#8a96a6");
        put(x - 1, 34 - Math.round(hh * 0.7), "#e8ecf2"); put(x + 1, 34 - Math.round(hh * 0.7), "#e8ecf2");
      }
    } else if (kind === "machu") {
      // Machu Picchu: terraces under Huayna Picchu
      w = 40; h = 30;
      for (let y = 0; y < 22; y++) {
        const half = Math.round(y * 0.55);
        rect(30 - half, y, half * 2 + 1, 1, (x) => ((x + y) % 4 === 0 ? "#2a6a3a" : "#3a8a4a"));
      }
      for (let i = 0; i < 8; i++) {
        const y = 14 + i * 2;
        rect(Math.max(0, 14 - i * 2), y, 26 + i * 2, 1, "#4caf50");
        rect(Math.max(0, 14 - i * 2), y + 1, 26 + i * 2, 1, "#8a8a7a");
      }
      for (const [x, y] of [[16, 11], [22, 11], [10, 17], [27, 17], [5, 23]]) {
        rect(x, y, 4, 3, "#a8a898"); hole(x + 1, y + 1, 1, 2, "#4a4a40"); rect(x, y - 1, 4, 1, "#c8a060");
      }
    } else if (kind === "lighthouse") {
      // the Pharos of Alexandria: square base, octagonal middle, round top with the fire
      w = 17; h = 38;
      rect(0, 34, 17, 4, "#c8b48a");
      rect(1, 22, 15, 12, "#e0d4b0");
      for (let y = 24; y < 33; y += 4) for (let x = 3; x < 15; x += 4) put(x, y, "#5a4a3a");
      rect(4, 12, 9, 10, "#e8dcc0"); put(8, 15, "#5a4a3a"); put(8, 19, "#5a4a3a");
      rect(6, 6, 5, 6, "#f0e6d0");
      rect(6, 3, 5, 3, "#ffb000"); put(8, 2, "#ff8a1a");
      put(8, 1, "#ffd34d"); put(8, 0, "#ffd34d");
    } else if (kind === "ger") {
      // the Great Khan's palace ger on its wagon platform, with horse-tail standards
      w = 34; h = 26;
      rect(0, 23, 34, 3, "#8a5a2a");
      for (const x of [3, 9, 25, 31]) put(x, 25, "#3a2a18");
      rect(4, 13, 26, 10, (x, y) => ((x + y) % 4 === 0 ? "#c8b48a" : "#f0ece0"));
      hole(15, 16, 4, 7, "#c83a2a");
      for (let y = 4; y < 13; y++) {
        const half = Math.round(4 + (y - 4) * 1.5);
        rect(17 - half, y, half * 2, 1, y % 3 === 0 ? "#c83a2a" : "#e8e0d0");
      }
      rect(15, 2, 4, 2, "#ffd34d");
      for (const x of [1, 32]) {
        rect(x, 4, 1, 19, "#8a5a2a");
        rect(x - 1, 4, 3, 3, "#2a2a2a");
        put(x, 3, "#ffd34d");
      }
    } else if (kind === "himeji") {
      // Himeji Castle: stone base and stacked white tiers under grey roofs
      w = 34; h = 34;
      for (let y = 26; y < 34; y++) {
        const inset = Math.max(0, 33 - y) >> 1;
        rect(inset, y, 34 - inset * 2, 1, (x) => ((x + y) % 3 ? "#8a8a80" : "#6a6a62"));
      }
      const tiers = [[3, 20, 28, 6], [6, 14, 22, 5], [9, 9, 16, 4], [12, 4, 10, 4]];
      for (const [x0, y0, tw, th] of tiers) {
        rect(x0, y0 + 1, tw, th - 1, "#f4f4f0");
        rect(x0 - 2, y0, tw + 4, 1, "#5a6470");
        put(x0 - 3, y0 - 1, "#5a6470"); put(x0 + tw + 2, y0 - 1, "#5a6470");
        for (let x = x0 + 2; x < x0 + tw - 1; x += 3) put(x, y0 + 2, "#3a3a3a");
      }
      rect(14, 2, 6, 2, "#5a6470");
      put(13, 1, "#ffd34d"); put(20, 1, "#ffd34d");
    } else if (kind === "arc") {
      // the Arc de Triomphe
      w = 30; h = 30;
      rect(0, 0, 30, 2, "#c8c0b0");
      rect(0, 2, 30, 4, "#d8d0c0");
      for (let x = 2; x < 28; x += 3) put(x, 3, "#8a8070");
      rect(0, 6, 30, 24, "#e8e0d0");
      hole(10, 15, 10, 15, "#2a2620");
      for (let x = 10; x < 20; x++) {
        const d = Math.abs(x - 14.5);
        const top = 15 - Math.round(Math.sqrt(Math.max(0, 25 - d * d)));
        rect(x, top, 1, 15 - top, "#2a2620");
      }
      hole(1, 20, 3, 10, "#2a2620"); hole(26, 20, 3, 10, "#2a2620");
      rect(3, 9, 5, 5, "#c8c0b0"); rect(22, 9, 5, 5, "#c8c0b0");
      rect(0, 13, 30, 1, "#c8c0b0");
    } else if (kind === "persepolis") {
      // the Gate of All Nations: winged bulls and tall columns
      w = 34; h = 30;
      rect(0, 27, 34, 3, "#a89a7a");
      rect(2, 16, 7, 11, "#c8b48a"); rect(25, 16, 7, 11, "#c8b48a");
      rect(1, 15, 3, 2, "#e0cfa8"); rect(30, 15, 3, 2, "#e0cfa8");
      for (const x of [2, 31]) put(x, 14, "#ffd34d");
      for (const x of [12, 21]) {
        rect(x, 6, 2, 21, (xx) => (xx === x ? "#e8d8b8" : "#d0c0a0"));
        rect(x - 2, 4, 6, 2, "#c8b48a");
      }
      rect(7, 2, 20, 2, "#d8c8a8");
      rect(12, 0, 10, 1, "#ffd34d"); put(17, 1, "#ffd34d");
    }
    // reveal order: bottom rows first
    return { dots: [...dots.values()].sort((a, b) => b.y - a.y), w, h };
  }
  const monCache = new Map();
  const getMonument = (kind) => {
    if (!monCache.has(kind)) monCache.set(kind, monument(kind));
    return monCache.get(kind);
  };

  // =====================================================================
  // The dot-matrix screen
  // =====================================================================
  const R = { w: 0, h: 0, dpr: 1, cell: 6, cols: 0, rows: 0, bg: null, dotImg: new Map(), lit: null, view: null };
  const BD = { on: false, area: null, out: null, introT: 1 }; // the backdrop ("dot world") state
  function dotImage(color) {
    let img = R.dotImg.get(color);
    if (img) return img;
    const s = Math.max(2, Math.round(R.cell * R.dpr));
    img = document.createElement("canvas");
    img.width = img.height = s;
    const g = img.getContext("2d");
    const r = s / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.55, color);
    grad.addColorStop(0.62, color + "66");
    grad.addColorStop(1, color + "00");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
    R.dotImg.set(color, img);
    return img;
  }
  // The part of the screen the floating panel doesn't cover, in dots.
  function visibleArea() {
    const top = Math.ceil(($(".wp-top", root)?.offsetHeight || 44) / R.cell) + 1;
    if (BD.on && BD.area) {
      // behind Avdle's cards: use the gap between the question card and the answer dock
      const a = BD.area();
      const cr = cv.getBoundingClientRect();
      const t = clamp(Math.ceil((a.top - cr.top) / R.cell) + 1, 0, Math.max(0, R.rows - 24));
      return { left: 0, top: t, right: R.cols, bottom: clamp(Math.floor((a.bottom - cr.top) / R.cell) - 1, t + 18, R.rows) };
    }
    let left = 0;
    const right = R.cols;
    let bottom = R.rows;
    if (panel.firstElementChild) {
      const pr = panel.getBoundingClientRect();
      const cr = cv.getBoundingClientRect();
      const wide = R.w >= 900 && !panel.classList.contains("min");
      // wide screens: the panel sits on the left, so the map gets the right
      if (wide) left = Math.round(Math.min(R.cols * 0.45, Math.ceil((pr.right - cr.left) / R.cell) + 1));
      else bottom = Math.max(top + 20, Math.floor((pr.top - cr.top) / R.cell) - 1);
    }
    return { left, top, right, bottom: Math.min(R.rows, bottom) };
  }
  function resize() {
    const rect = cv.getBoundingClientRect();
    R.dpr = Math.min(2, window.devicePixelRatio || 1);
    R.w = Math.max(1, rect.width);
    R.h = Math.max(1, rect.height);
    cv.width = Math.round(R.w * R.dpr);
    cv.height = Math.round(R.h * R.dpr);
    R.cell = clamp(Math.round(Math.min(R.w / 150, R.h / 95)), 4, 8);
    R.cols = Math.floor(R.w / R.cell);
    R.rows = Math.floor(R.h / R.cell);
    R.ox = (R.w - R.cols * R.cell) / 2;
    R.oy = (R.h - R.rows * R.cell) / 2;
    R.dotImg.clear();
    R.lit = new Array(R.cols * R.rows);
    R.bg = document.createElement("canvas");
    R.bg.width = cv.width;
    R.bg.height = cv.height;
    const g = R.bg.getContext("2d");
    g.fillStyle = "#07090d";
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = C.grid;
    const rr = R.cell * R.dpr * 0.28;
    for (let y = 0; y < R.rows; y++)
      for (let x = 0; x < R.cols; x++) {
        g.beginPath();
        g.arc((R.ox + (x + 0.5) * R.cell) * R.dpr, (R.oy + (y + 0.5) * R.cell) * R.dpr, rr, 0, Math.PI * 2);
        g.fill();
      }
    R.view = null;
    refit(true);
  }
  // Re-project the map when the free area changes (the panel grows, shrinks or is tucked away).
  function refit(force) {
    if (!R.cols) return;
    const v = visibleArea();
    const old = R.view;
    if (!force && old && Math.abs(old.left - v.left) < 3 && Math.abs(old.bottom - v.bottom) < 3 && old.emp === G.empire) return;
    R.view = { ...v, emp: G.empire };
    buildMap();
    buildArena();
  }
  let SHAKE = [0, 0];
  const clear = () => R.lit.fill(undefined);
  function set(x, y, c) {
    x = Math.round(x + SHAKE[0]);
    y = Math.round(y + SHAKE[1]);
    if (x < 0 || y < 0 || x >= R.cols || y >= R.rows) return;
    R.lit[y * R.cols + x] = c;
  }
  function present(flash, flashColor = C.white) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const s = R.cell * R.dpr;
    // the dot world arriving (zooms in from far away) or leaving (every dot flies off the screen)
    const intro = BD.on && BD.introT < 1 ? ease(BD.introT) : 1;
    const out = BD.out ? BD.out.t : 0;
    ctx.globalAlpha = intro * (1 - out);
    ctx.drawImage(R.bg, 0, 0);
    ctx.globalAlpha = 1;
    if (intro < 1 || out > 0) {
      const v = R.view || { top: 0, bottom: R.rows };
      const cx = R.cols / 2;
      const cy = (v.top + v.bottom) / 2;
      const scale = 0.12 + 0.88 * intro;
      for (let i = 0; i < R.lit.length; i++) {
        const c = R.lit[i];
        if (!c) continue;
        let x = i % R.cols;
        let y = (i / R.cols) | 0;
        const h = ((i * 2654435761) >>> 0) / 4294967296;
        if (intro < 1) {
          if (h > intro * 1.4) continue; // dots light up one by one as it zooms in
          x = cx + (x - cx) * scale;
          y = cy + (y - cy) * scale;
        }
        if (out > 0) {
          const dx = x - cx + (h - 0.5) * 6;
          const dy = y - cy + (h - 0.5) * 6;
          const len = Math.hypot(dx, dy) || 1;
          const push = out * out * R.cols * (0.5 + h);
          x += (dx / len) * push;
          y += (dy / len) * push + out * out * 30 * h;
          ctx.globalAlpha = 1 - out * 0.6;
        }
        ctx.drawImage(dotImage(c), (R.ox + x * R.cell) * R.dpr, (R.oy + y * R.cell) * R.dpr, s, s);
      }
      ctx.globalAlpha = 1;
    } else
      for (let i = 0; i < R.lit.length; i++) {
        const c = R.lit[i];
        if (!c) continue;
        ctx.drawImage(dotImage(c), (R.ox + (i % R.cols) * R.cell) * R.dpr, (R.oy + ((i / R.cols) | 0) * R.cell) * R.dpr, s, s);
      }
    if (flash > 0) {
      ctx.globalAlpha = clamp(flash, 0, 1) * 0.85;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalAlpha = 1;
    }
  }
  function sprite(sp, x, y, opt = {}) {
    const { flip = false, color = null, k = 1, lying = false, sink = 0, alpha = 1 } = opt;
    for (const d of sp.dots) {
      if (alpha < 1 && Math.random() > alpha) continue;
      let sx = flip ? sp.w - 1 - d.x : d.x;
      let sy = d.y;
      if (lying) [sx, sy] = [sy, sp.w - 1 - sx]; // knocked flat, head to the left
      if (sy + sink >= sp.h) continue;
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) set(x + sx * k + a, y + (sy + sink) * k + b, color || d.c);
    }
  }
  function line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) set(lerp(x0, x1, i / n), lerp(y0, y1, i / n), c);
  }
  function text(str, cx, y, c, k = 1, blink = false) {
    const t = textDots(str);
    const x0 = Math.round(cx - (t.w * k) / 2);
    for (const [x, yy] of t.dots) {
      if (blink && Math.random() < 0.08) continue;
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) set(x0 + x * k + a, y + yy * k + b, c);
    }
    return t.w * k;
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0");
    return "#" + c(n >> 16) + c((n >> 8) & 255) + c(n & 255);
  }

  // =====================================================================
  // The empire map
  // =====================================================================
  const MAP = { cells: [], route: [], cum: [], len: 1, cities: [], mon: null };
  function ringFix(ring) {
    // d3 wants exterior rings clockwise; flip any ring that came out inside-out
    const closed = [...ring, ring[0]];
    return d3.geoArea({ type: "Polygon", coordinates: [closed] }) > 2 * Math.PI ? [closed.slice().reverse()] : [closed];
  }
  function buildMap() {
    MAP.cells = [];
    MAP.route = [];
    MAP.cities = [];
    if (!R.cols || !R.view) return;
    const emp = EMP[G.empire];
    const v = R.view;
    const off = document.createElement("canvas");
    off.width = R.cols;
    off.height = R.rows;
    const g = off.getContext("2d", { willReadFrequently: true });
    const [[x0, y0], [x1, y1]] = emp.view;
    const box = [[v.left + 2, v.top + 2], [v.right - 2, v.bottom - 2]];
    let proj;
    if (window.d3 && window.topojson && window.WORLD) {
      proj = d3.geoMercator().fitExtent(box, { type: "MultiPoint", coordinates: [[x0, y0], [x1, y1], [x0, y1], [x1, y0]] });
      const path = d3.geoPath(proj, g);
      g.fillStyle = "#f00"; // land in the red channel
      g.beginPath();
      path(topojson.feature(WORLD, WORLD.objects.countries));
      g.fill();
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = "#ff0"; // the empire: red + green
      for (const ring of emp.lands) {
        g.beginPath();
        path({ type: "Polygon", coordinates: ringFix(ring) });
        g.fill();
      }
      g.globalCompositeOperation = "source-over";
    } else {
      const s = Math.min((box[1][0] - box[0][0]) / (x1 - x0), (box[1][1] - box[0][1]) / (y1 - y0));
      proj = (ll) => [box[0][0] + (ll[0] - x0) * s, box[1][1] - (ll[1] - y0) * s];
      g.fillStyle = "#ff0";
      for (const ring of emp.lands) {
        g.beginPath();
        ring.forEach((p, i) => (i ? g.lineTo(...proj(p)) : g.moveTo(...proj(p))));
        g.fill();
      }
    }
    const px = g.getImageData(0, 0, R.cols, R.rows).data;
    const kind = (x, y) => (x < 0 || y < 0 || x >= R.cols || y >= R.rows ? 0 : px[(y * R.cols + x) * 4] > 100 ? (px[(y * R.cols + x) * 4 + 1] > 100 ? 2 : 1) : 0);
    const bright = shade(emp.color, 1.45);
    for (let y = 0; y < R.rows; y++)
      for (let x = 0; x < R.cols; x++) {
        const k = kind(x, y);
        if (k === 0) {
          if ((x + y * 3) % 4 === 0) MAP.cells.push([x, y, (x * 7 + y * 13) % 11 === 0 ? C.seaHi : C.sea]);
          continue;
        }
        const coast = kind(x - 1, y) === 0 || kind(x + 1, y) === 0 || kind(x, y - 1) === 0 || kind(x, y + 1) === 0;
        const edge = k === 2 && (kind(x - 1, y) === 1 || kind(x + 1, y) === 1 || kind(x, y - 1) === 1 || kind(x, y + 1) === 1);
        MAP.cells.push([x, y, coast ? (k === 2 ? bright : C.coast) : edge ? bright : k === 2 ? emp.color : C.land]);
      }
    MAP.cities = emp.route.map(([name, lon, lat]) => {
      const [x, y] = proj([lon, lat]);
      return { name, x, y };
    });
    const pts = MAP.cities;
    MAP.cum = [0];
    for (let i = 1; i < pts.length; i++) MAP.cum.push(MAP.cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    MAP.len = MAP.cum[MAP.cum.length - 1] || 1;
    const seen = new Set();
    for (let d = 0; d <= MAP.len; d += 0.5) {
      const p = routeAt(d / MAP.len);
      const key = Math.round(p.x) + "," + Math.round(p.y);
      if (seen.has(key)) continue;
      seen.add(key);
      MAP.route.push({ x: Math.round(p.x), y: Math.round(p.y), f: d / MAP.len });
    }
    const m = getMonument(emp.monument);
    MAP.mon = { x: v.right - m.w - 3, y: v.top + 1 };
  }
  function routeAt(f) {
    const pts = MAP.cities;
    if (!pts.length) return { x: 0, y: 0, seg: 0 };
    if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, seg: 0 };
    const d = clamp(f, 0, 1) * MAP.len;
    let i = 1;
    while (i < MAP.cum.length - 1 && MAP.cum[i] < d) i++;
    const a = pts[i - 1];
    const b = pts[i];
    const t = clamp((d - MAP.cum[i - 1]) / Math.max(1e-6, MAP.cum[i] - MAP.cum[i - 1]), 0, 1);
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), seg: i - 1 };
  }
  function placeAt(f) {
    const p = routeAt(f);
    let best = null;
    let bd = Infinity;
    for (const c of MAP.cities) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bd) [bd, best] = [d, c];
    }
    if (!best) return "";
    return bd < 6 ? best.name : `the road to ${MAP.cities[Math.min(MAP.cities.length - 1, p.seg + 1)].name}`;
  }

  function drawMonument(x, y, k, frac, ghost = true, sparkleFrom = null) {
    const m = getMonument(EMP[G.empire].monument);
    const n = Math.round(m.dots.length * clamp(frac, 0, 1));
    m.dots.forEach((d, i) => {
      const built = i < n;
      const isNew = sparkleFrom != null && built && i >= sparkleFrom;
      const c = built ? (isNew && Math.random() < 0.25 ? C.white : d.c) : ghost ? C.ghost : null;
      if (!c) return;
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) set(x + d.x * k + a, y + d.y * k + b, c);
    });
    return m;
  }

  function drawMap(now) {
    for (const [x, y, c] of MAP.cells) set(x, y, c);
    for (const r of MAP.route) if (r.x % 2 === 0 || r.y % 2 === 0) set(r.x, r.y, r.f <= V.prog + 0.001 ? C.routeHi : C.route);
    for (const c of MAP.cities) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(c.x + a, c.y + b, C.city);
    if (MAP.mon) drawMonument(MAP.mon.x, MAP.mon.y, 1, G.monument / MONUMENT_STAGES);
    // the foe waiting ahead
    if (V.target != null && V.foe) {
      const p = routeAt(V.target);
      const sp = V.foe.frames[Math.floor(now / 400) % 2];
      if (sp.w <= 16) sprite(sp, p.x - sp.w / 2, p.y - sp.h + 1);
      else for (const d of sp.dots) if (d.x % 2 === 0 && d.y % 2 === 0) set(p.x - sp.w / 4 + d.x / 2, p.y - sp.h / 2 + 1 + d.y / 2, d.c);
      if (Math.floor(now / 300) % 2) set(p.x, p.y + 2, C.red);
    }
    // your warrior
    const g = routeAt(V.gProg);
    const walking = Math.abs(V.gProg - V.prog) > 0.0005;
    const sp = WARRIOR[walking ? Math.floor(now / 160) % 2 : 0];
    const ahead = V.target != null ? routeAt(V.target) : routeAt(Math.min(1, V.gProg + 0.02));
    const flip = ahead.x < g.x - 0.5;
    sprite(sp, g.x - sp.w / 2, g.y - sp.h + 1, { flip });
    swordAndShield(g.x - sp.w / 2, g.y - sp.h + 1, 1, flip ? Math.PI + 0.6 : -0.6, flip);
  }
  function drawMapLabels() {
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.font = `600 ${clamp(R.cell * 1.8, 10, 12)}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (const c of MAP.cities) {
      const x = R.ox + (c.x + 2.5) * R.cell;
      const y = R.oy + (c.y + 0.5) * R.cell;
      const w = ctx.measureText(c.name).width;
      const right = x + w + 4 < R.w;
      const bx = right ? x - 2 : x - 4 * R.cell - w - 2;
      ctx.fillStyle = "rgba(7,9,13,0.72)";
      ctx.fillRect(bx, y - 7, w + 4, 14);
      ctx.fillStyle = "#e8c77a";
      ctx.fillText(c.name, bx + 2, y);
    }
    if (MAP.mon) {
      const emp = EMP[G.empire];
      const m = getMonument(emp.monument);
      const label = `${emp.monumentName} ${G.monument}/${MONUMENT_STAGES}`;
      const x = R.ox + (MAP.mon.x + m.w / 2) * R.cell;
      const y = R.oy + (MAP.mon.y + m.h + 1.5) * R.cell;
      ctx.textAlign = "center";
      const w = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(7,9,13,0.72)";
      ctx.fillRect(x - w / 2 - 3, y - 7, w + 6, 14);
      ctx.fillStyle = G.monument ? "#ffd34d" : "#7a7060";
      ctx.fillText(label, x, y);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function swordAndShield(x, y, k, angle, flip) {
    const hx = x + (flip ? 0 : HAND[0]) * k;
    const hy = y + HAND[1] * k;
    const len = 8 * k;
    line(hx, hy, hx + Math.cos(angle) * len, hy + Math.sin(angle) * len, C.sword);
    set(hx, hy, C.hilt);
    set(hx + Math.cos(angle + Math.PI / 2) * k, hy + Math.sin(angle + Math.PI / 2) * k, C.hilt);
    set(hx - Math.cos(angle + Math.PI / 2) * k, hy - Math.sin(angle + Math.PI / 2) * k, C.hilt);
    const sx = x + (flip ? 8 - SHIELD_AT[0] : SHIELD_AT[0]) * k;
    const sy = y + SHIELD_AT[1] * k;
    const r = 2.6 * k;
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r) set(sx + a, sy + b, a * a + b * b <= (r * 0.4) ** 2 ? C.gold : C.shield);
  }
  // the foe's weapon and shield (foes face left, so "forward" is angle π)
  function foeGear(foe, x, y, k, swing, flip) {
    if (!foe.weapon) return;
    const fw = foe.frames[0].w;
    const dir = flip ? 1 : -1;
    const hx = x + (flip ? fw - 1 - foe.hand[0] : foe.hand[0]) * k;
    const hy = y + foe.hand[1] * k;
    // swing 0 = raised, 1 = thrust forward
    const ang = flip ? lerp(-0.9, 0, swing) : lerp(Math.PI + 0.9, Math.PI, swing);
    const cx = Math.cos(ang);
    const sy = Math.sin(ang);
    const wpn = foe.weapon;
    if (wpn === "spear" || wpn === "lance") {
      const L = (wpn === "lance" ? 13 : 11) * k;
      line(hx - cx * 3 * k, hy - sy * 3 * k, hx + cx * L, hy + sy * L, C.wood);
      set(hx + cx * L, hy + sy * L, C.white);
      set(hx + cx * (L + k), hy + sy * (L + k), C.white);
    } else if (wpn === "bow") {
      const r = 4 * k;
      for (let a = -1.1; a <= 1.1; a += 0.12) set(hx + dir * Math.cos(a) * r, hy + Math.sin(a) * r, C.wood);
      line(hx + dir * Math.cos(1.1) * r, hy - Math.sin(1.1) * r, hx + dir * Math.cos(1.1) * r, hy + Math.sin(1.1) * r, C.steel);
    } else {
      const L = 6 * k;
      const ex = hx + cx * L;
      const ey = hy + sy * L;
      line(hx, hy, ex, ey, wpn === "sword" || wpn === "falx" ? C.steel : C.wood);
      if (wpn === "falx") line(ex, ey, ex + dir * 2 * k, ey + 3 * k, C.steel);
      if (wpn === "axe") for (let a = -k; a <= k; a++) for (let b = 0; b <= k + 1; b++) set(ex + dir * b, ey + a, C.steel);
      if (wpn === "club" || wpn === "mace") for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) if (a * a + b * b <= k * k + 1) set(ex + a, ey + b, wpn === "mace" ? C.steel : C.wood);
      set(hx, hy, C.hilt);
    }
    if (foe.shield && foe.shieldAt) {
      const sx = x + (flip ? fw - 1 - foe.shieldAt[0] : foe.shieldAt[0]) * k;
      const syy = y + foe.shieldAt[1] * k;
      if (foe.shield === "round") {
        const r = 2.6 * k;
        for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r) set(sx + a, syy + b, a * a + b * b <= (r * 0.4) ** 2 ? C.gold : foe.shieldC);
      } else for (let a = -1.5 * k; a <= 1.5 * k; a++) for (let b = -3 * k; b <= 3 * k; b++) set(sx + a, syy + b, Math.abs(a) < k * 0.6 && Math.abs(b) < k ? C.gold : foe.shieldC);
    }
  }

  // =====================================================================
  // The arena (duel scene)
  // =====================================================================
  const ARENA = { cells: [], ground: 0, k: 1 };
  function buildArena() {
    ARENA.cells = [];
    if (!R.cols || !R.view) return;
    const { top, bottom } = R.view;
    ARENA.k = clamp(Math.floor((bottom - top) / 34), 1, 3);
    ARENA.ground = Math.round(top + (bottom - top) * 0.86);
    const gr = ARENA.ground;
    const rng = seeded(7);
    for (let i = 0; i < R.cols * R.rows * 0.01; i++) ARENA.cells.push([Math.floor(rng() * R.cols), Math.floor(top + rng() * (gr - top) * 0.6), C.star, 1]);
    for (let x = 0; x < R.cols; x++) {
      const h = Math.round((gr - top) * 0.16 + Math.sin(x / 9) * 3 + Math.sin(x / 23 + 1) * 5);
      for (let y = gr - h; y < gr; y++) if ((x + y) % 2 === 0) ARENA.cells.push([x, y, C.hill, 0]);
    }
    for (let x = 0; x < R.cols; x++) {
      ARENA.cells.push([x, gr, C.ground, 0]);
      if (x % 3 === 0) ARENA.cells.push([x, gr + 2, C.ground, 0]);
      if (x % 5 === 1) ARENA.cells.push([x, gr + 4, C.ground, 0]);
    }
  }

  // =====================================================================
  // Particles
  // =====================================================================
  let P = [];
  const burst = (x, y, n, colors, speed = 1, spread = Math.PI * 2, dir = 0, grav = 0.04, life = 900) => {
    if (reduceMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.3 + Math.random());
      P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: colors[(Math.random() * colors.length) | 0], life: life * (0.5 + Math.random() * 0.8), age: 0, grav });
    }
  };
  function stepParticles(dt, floor) {
    const f = dt / 16;
    P = P.filter((p) => (p.age += dt) < p.life);
    for (const p of P) {
      p.vy += p.grav * f;
      p.x += p.vx * f;
      p.y += p.vy * f;
      if (floor != null && p.y > floor - 1 && p.grav > 0) {
        p.y = floor - 1;
        p.vy *= -0.3;
        p.vx *= 0.6;
      }
      set(p.x, p.y, p.c);
    }
  }

  // =====================================================================
  // Fights. The closer the year, the bigger the show.
  // =====================================================================
  const V = { scene: "map", prog: 0, gProg: 0, target: null, foe: null, duel: null, mon: null, flash: 0, flashColor: C.white, shake: 0, banner: null };

  let duelLabel = null; // a one-on-one fight shows who won instead of the usual banner
  function startDuel(tier, foe, place, done) {
    P = [];
    refit(true);
    const k = ARENA.k;
    const fk = foe.boss || foe.big ? k + 1 : k;
    const fsp = foe.frames[0];
    const gsp = WARRIOR[0];
    const gr = ARENA.ground;
    const bx = Math.round(R.view.left + (R.view.right - R.view.left) * 0.58);
    const by = gr - fsp.h * fk;
    const front = bx - gsp.w * k - 2 * k;
    V.duel = { tier, foe, k, fk, bx, by, front, gr, place, t: 0, fired: new Set(), done, end: [5200, 4200, 4800, 4200, 3800, 3200][tier], label: duelLabel };
    duelLabel = null;
    V.scene = "duel";
    V.banner = null;
  }
  const at = (D, t, fn) => {
    if (D.t >= t && !D.fired.has(t)) {
      D.fired.add(t);
      fn();
    }
  };
  const seg = (D, a, b) => clamp((D.t - a) / (b - a), 0, 1);

  function drawDuel(dt, now) {
    const D = V.duel;
    D.t += dt;
    const { k, fk, foe, gr, front, tier } = D;
    for (const [x, y, c, tw] of ARENA.cells) if (!tw || Math.floor(now / 700 + x) % 5) set(x, y, c);
    const cx = (R.view.left + R.view.right) / 2;
    text(D.place, cx, R.view.top + 1, shade(EMP[G.empire].color, 1.6));
    text((foe.boss ? "BOSS: " : "") + foe.name, cx, R.view.top + 10, foe.boss ? C.red : C.city);

    const gsp = WARRIOR[0];
    const gh = gsp.h * k;
    const fsp = foe.frames[Math.floor(now / (foe.dragon ? 220 : 300)) % 2];
    const mouth = () => [D.bx + foe.mouth[0] * fk, D.by + foe.mouth[1] * fk];
    const hit = (n = 14, colors = [C.white, C.gold, C.ember]) => burst(D.bx + 2 * fk, D.by + fsp.h * fk * 0.4, n, colors, 1.4 * k, Math.PI * 1.2, 0);
    let gx = lerp(R.view.left - 12 * k, front - 8 * k, ease(seg(D, 0, 800)));
    let gy = gr - gh;
    let walking = D.t < 800;
    let sword = -0.5;
    let lying = false;
    let gAlpha = 1;
    let bxo = 0;
    let bFlash = false;
    let bSink = 0;
    let bFlip = false;
    let bShow = true;
    let bAlpha = 1;
    let swing = 0;
    const shake = (n) => (V.shake = Math.max(V.shake, n));
    const flash = (n, c = C.white) => {
      V.flash = Math.max(V.flash, n);
      V.flashColor = c;
    };
    const banner = (big, small, color) => (V.banner = D.label ? { ...D.label, t0: now } : { big, small, color, t0: now });
    const slashAt = (t0, dur = 220) => {
      const s = seg(D, t0, t0 + dur);
      if (s > 0 && s < 1) sword = lerp(-1.9, 0.6, ease(s));
    };
    const warCry = () => {
      const [mx, my] = mouth();
      if (foe.dragon) burst(mx, my, 3, [C.fire, C.ember, C.red], 1.6 * k, 0.5, Math.PI, 0, 500);
      else if (foe.weapon === "bow") P.push({ x: mx, y: my + 2 * fk, vx: -2.2 * k, vy: 0, c: C.steel, life: 600, age: 0, grav: 0 });
      else burst(mx, my, 1, [C.white], 0.8 * k, 0.8, Math.PI, 0, 300);
    };

    if (tier === 0) {
      // the full show: war cry, a leap, three slashes, and the foe bursts apart
      if (D.t > 800 && D.t < 1300) {
        shake(1.5);
        if (Math.random() < 0.6) warCry();
        sword = -1.6;
        swing = Math.sin(seg(D, 800, 1300) * Math.PI);
      }
      const leap = seg(D, 1300, 1650);
      if (D.t >= 1300) {
        gx = lerp(front - 8 * k, front, ease(leap));
        gy = gr - gh - Math.sin(leap * Math.PI) * 8 * k;
        walking = false;
      }
      for (const t0 of [1650, 1900, 2150]) {
        slashAt(t0);
        at(D, t0 + 120, () => (hit(18), shake(2)));
        if (D.t > t0 + 100 && D.t < t0 + 200) bFlash = true;
      }
      at(D, 2450, () => {
        flash(1);
        shake(6);
        for (const d of fsp.dots)
          for (let a = 0; a < fk; a++) {
            const x = D.bx + d.x * fk + a;
            const y = D.by + d.y * fk;
            const ang = Math.atan2(y - (D.by + fsp.h * fk * 0.5), x - (D.bx + fsp.w * fk * 0.5)) + (Math.random() - 0.5) * 0.8;
            const v = (1 + Math.random() * 2.2) * k;
            P.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 1, c: Math.random() < 0.3 ? C.gold : d.c, life: 1400 + Math.random() * 900, age: 0, grav: 0.05 });
          }
        burst(D.bx + fsp.w * fk * 0.5, D.by + fsp.h * fk * 0.5, 120, [C.gold, C.white, C.fire, C.ember], 2.6 * k, Math.PI * 2, 0, 0.03, 1600);
      });
      if (D.t >= 2350 && D.t < 2450) sword = lerp(-2.2, 0.8, (D.t - 2350) / 100);
      if (D.t >= 2450) {
        bShow = false;
        sword = -Math.PI / 2;
        if (D.t < 3400 && Math.random() < 0.5) burst(gx + 8 * k, gy - 6 * k, 2, [C.gold, C.white], 0.8 * k, Math.PI * 2, 0, -0.01, 700);
      }
      at(D, 2750, () => banner(foe.dragon ? "DRAGON SLAIN!" : "CRUSHED!", "EXACT YEAR", C.gold));
      at(D, 3200, () => shake(2));
    } else if (tier === 1) {
      if (D.t >= 800) gx = lerp(front - 8 * k, front, ease(seg(D, 800, 1050)));
      slashAt(1100);
      at(D, 1230, () => (hit(14), shake(1.5)));
      if (D.t > 1200 && D.t < 1300) bFlash = true;
      if (D.t > 1450 && D.t < 1700) {
        bxo = -Math.sin(seg(D, 1450, 1700) * Math.PI) * 4 * k;
        swing = Math.sin(seg(D, 1450, 1700) * Math.PI);
      }
      at(D, 1580, () => burst(gx + 2 * k, gy + 9 * k, 10, [C.white, C.gold], k, Math.PI, Math.PI));
      slashAt(1850, 260);
      at(D, 2000, () => (hit(30), shake(3.5), flash(0.35)));
      if (D.t > 1980 && D.t < 2100) bFlash = true;
      if (D.t > 2100) {
        bSink = Math.floor(seg(D, 2100, 2900) * fsp.h);
        if (Math.random() < 0.6) burst(D.bx + Math.random() * fsp.w * fk, gr - 1, 2, [C.dust], 0.6 * k, Math.PI * 0.8, -Math.PI / 2, 0.03, 600);
        if (D.t > 2900) sword = -Math.PI / 2;
      }
      at(D, 2350, () => banner("VICTORY", "CLOSE", C.ember));
    } else if (tier === 2) {
      if (D.t >= 800) gx = lerp(front - 8 * k, front, ease(seg(D, 800, 1050)));
      at(D, 1150, () => (burst(front + 6 * k, gy + 6 * k, 12, [C.white, C.gold]), shake(1.5)));
      if (D.t > 1050 && D.t < 1250) sword = -0.2;
      const kb = seg(D, 1400, 1700);
      if (D.t >= 1400) gx = lerp(front, front - 10 * k, Math.sin((kb * Math.PI) / 2)) + (D.t > 1900 ? ease(seg(D, 1900, 2150)) * 10 * k : 0);
      if (D.t > 1350 && D.t < 1550) {
        bxo = -Math.sin(seg(D, 1350, 1550) * Math.PI) * 6 * k;
        swing = Math.sin(seg(D, 1350, 1550) * Math.PI);
      }
      at(D, 1450, () => (flash(0.3, C.red), shake(2.5), burst(gx + 4 * k, gy + 6 * k, 8, [C.red, C.blood], k, Math.PI, Math.PI)));
      slashAt(2200);
      at(D, 2330, () => (hit(12), shake(1.5)));
      if (D.t > 2300 && D.t < 2400) bFlash = true;
      if (D.t > 2550 && D.t < 2750) {
        bxo = -Math.sin(seg(D, 2550, 2750) * Math.PI) * 3 * k;
        swing = Math.sin(seg(D, 2550, 2750) * Math.PI);
      }
      at(D, 2650, () => burst(gx + 2 * k, gy + 9 * k, 8, [C.white, C.gold], k, Math.PI, Math.PI));
      slashAt(2950, 260);
      at(D, 3100, () => (hit(22), shake(3)));
      if (D.t > 3200) bSink = Math.floor(seg(D, 3200, 4100) * fsp.h);
      at(D, 3300, () => banner("HARD-WON", "NEAR", C.gold));
    } else if (tier === 3) {
      if (D.t >= 800) gx = lerp(front - 8 * k, front, ease(seg(D, 800, 1050)));
      slashAt(1100);
      at(D, 1230, () => burst(D.bx + 2 * fk, D.by + 4 * fk, 5, [C.white]));
      const th = seg(D, 1400, 1900);
      if (D.t > 1350 && D.t < 1550) {
        bxo = -Math.sin(seg(D, 1350, 1550) * Math.PI) * 7 * k;
        swing = 1;
      }
      if (D.t >= 1400) {
        gx = lerp(front, front - 16 * k, ease(th));
        gy = gr - gh - Math.sin(th * Math.PI) * 6 * k;
        lying = D.t > 1700 && D.t < 2400;
        if (lying) gy = gr - gsp.w * k;
      }
      at(D, 1450, () => (flash(0.4, C.red), shake(3)));
      at(D, 1900, () => (shake(2), burst(gx + 6 * k, gr - 1, 14, [C.dust], k, Math.PI, -Math.PI / 2)));
      if (D.t > 2500) {
        bFlip = true;
        bxo = ease(seg(D, 2600, 3600)) * (R.cols - D.bx + 4);
        bFlash = Math.floor(D.t / 120) % 2 === 0 && D.t < 2700;
      }
      at(D, 2700, () => banner("IT GOT AWAY", "ROUGH", C.ember));
    } else if (tier === 4) {
      // the foe wins this round
      if (D.t >= 800) gx = front - 8 * k;
      at(D, 1000, () => {
        shake(2);
        const [mx, my] = mouth();
        burst(mx, my, 20, foe.dragon ? [C.fire, C.ember] : [C.white, C.fog], 1.4 * k, 0.8, Math.PI, 0, 600);
      });
      if (D.t > 1200) {
        bxo = -ease(seg(D, 1200, 1450)) * (D.bx - (front - 2 * k));
        swing = seg(D, 1200, 1450);
      }
      at(D, 1420, () => (flash(0.55, C.red), shake(4.5), burst(gx + 6 * k, gy + 6 * k, 18, [C.red, C.blood, C.white], 1.3 * k)));
      if (D.t > 1420) {
        lying = true;
        gy = gr - gsp.w * k;
        gx = front - 14 * k;
      }
      at(D, 1900, () => banner("FELLED", "WAY OFF", C.red));
      at(D, 2300, () => shake(2));
    } else {
      // no answer: fog rolls in and your warrior fades away
      gx = lerp(R.view.left - 12 * k, front - 14 * k, ease(seg(D, 0, 800)));
      if (D.t > 500 && D.t < 2400 && Math.random() < 0.9) burst(R.view.left + Math.random() * (R.view.right - R.view.left), gr - Math.random() * gh * 2, 3, [C.fog], 0.25, Math.PI * 2, 0, 0, 1400);
      gAlpha = 1 - seg(D, 900, 2300) * 0.9;
      bAlpha = 1 - seg(D, 600, 1600);
      at(D, 1500, () => banner("LOST IN TIME", "NO ANSWER", C.fog));
    }

    if (bShow && bAlpha > 0.02) {
      sprite(fsp, D.bx + bxo, D.by, { k: fk, color: bFlash ? C.white : null, sink: bSink, flip: bFlip, alpha: bAlpha });
      if (!bSink && !bFlash && bAlpha > 0.5) foeGear(foe, D.bx + bxo, D.by, fk, swing, bFlip);
    }
    sprite(WARRIOR[walking ? Math.floor(now / 140) % 2 : 0], gx, gy, { k, lying, alpha: gAlpha });
    if (!lying && gAlpha > 0.4) swordAndShield(gx, gy, k, sword, false);
    stepParticles(dt, gr);
    drawBanner(now);

    if (D.t >= D.end) {
      V.duel = null;
      V.scene = "map";
      V.banner = null;
      D.done && D.done();
    }
  }
  function drawBanner(now) {
    const bn = V.banner;
    if (!bn) return;
    const age = now - bn.t0;
    const big = textDots(bn.big);
    const span = R.view.right - R.view.left;
    const k = clamp(Math.floor((span * 0.85) / big.w), 1, 4);
    const kk = Math.max(1, Math.round(k * (age < 160 ? 2 - age / 160 : 1)));
    const y = Math.round(R.view.top + (R.view.bottom - R.view.top) * 0.22);
    const cx = (R.view.left + R.view.right) / 2;
    text(bn.big, cx, y, bn.color, kk, true);
    if (age > 250) text(bn.small, cx, y + 7 * kk + 3, C.city, 1);
  }

  // The monument rises (after an exact answer, or a close one on a hard moment).
  function startMonumentRise(from, to, done) {
    V.mon = { from, to, t: 0, done, end: to >= MONUMENT_STAGES ? 4600 : 3000 };
    V.scene = "monument";
    V.banner = null;
    P = [];
  }
  function drawMonumentScene(dt, now) {
    const M = V.mon;
    M.t += dt;
    const emp = EMP[G.empire];
    const m = getMonument(emp.monument);
    const v = R.view;
    const k = clamp(Math.floor(Math.min((v.bottom - v.top - 24) / m.h, (v.right - v.left - 6) / m.w)), 1, 4);
    const x = Math.round((v.left + v.right) / 2 - (m.w * k) / 2);
    const y = Math.round(v.bottom - 3 - m.h * k);
    for (const [cx, cy, c, tw] of ARENA.cells) if (tw && Math.floor(now / 700 + cx) % 5) set(cx, cy, c);
    for (let xx = 0; xx < R.cols; xx++) set(xx, y + m.h * k, C.ground);
    const s = ease(clamp((M.t - 300) / 1500, 0, 1));
    const frac = lerp(M.from, M.to, s) / MONUMENT_STAGES;
    drawMonument(x, y, k, frac, true, Math.round(m.dots.length * (M.from / MONUMENT_STAGES)));
    if (M.t > 300 && M.t < 1800 && Math.random() < 0.8) {
      const d = m.dots[Math.max(0, Math.round(m.dots.length * frac) - 1)];
      if (d) burst(x + d.x * k, y + d.y * k, 3, [C.gold, C.white, C.dust], 0.8 * k, Math.PI, -Math.PI / 2, 0.03, 700);
    }
    if (M.to >= MONUMENT_STAGES && M.t > 1900 && (!M.fw || M.t - M.fw > 380)) {
      M.fw = M.t;
      burst(v.left + Math.random() * (v.right - v.left), v.top + 8 + Math.random() * 12, 40, [C.gold, C.red, C.white, C.ember], 1.4, Math.PI * 2, 0, 0.02, 1100);
      V.shake = Math.max(V.shake, 1.5);
    }
    if (!V.banner) V.banner = { big: M.to >= MONUMENT_STAGES ? "COMPLETE!" : "IT RISES", small: `${emp.monumentName} ${M.to}/${MONUMENT_STAGES}`, color: C.gold, t0: now };
    stepParticles(dt, y + m.h * k);
    drawBanner(now);
    if (M.t >= M.end) {
      V.mon = null;
      V.scene = "map";
      V.banner = null;
      M.done && M.done();
    }
  }

  // =====================================================================
  // Animation loop
  // =====================================================================
  let rafId = 0;
  let last = 0;
  function frame(now) {
    rafId = 0;
    if (root.hidden) return;
    const dt = Math.min(50, now - (last || now));
    last = now;
    try {
      if (!R.view) refit(true);
      clear();
      V.shake *= 0.86;
      SHAKE = V.shake > 0.3 && !reduceMotion ? [(Math.random() - 0.5) * V.shake * 2, (Math.random() - 0.5) * V.shake * 2] : [0, 0];
      if (V.scene === "duel" && V.duel) drawDuel(dt, now);
      else if (V.scene === "monument" && V.mon) drawMonumentScene(dt, now);
      else {
        const d = V.prog - V.gProg;
        V.gProg += Math.sign(d) * Math.min(Math.abs(d), dt * 0.00012 + Math.abs(d) * 0.02);
        drawMap(now);
        stepParticles(dt, null);
      }
      SHAKE = [0, 0];
      V.flash *= 0.88;
      present(V.flash > 0.02 ? V.flash : 0, V.flashColor);
      if (V.scene === "map" && R.cols > 70 && !(BD.on && (BD.introT < 1 || BD.out))) drawMapLabels();
      if (BD.on) {
        if (BD.introT < 1) BD.introT = Math.min(1, BD.introT + dt / 1100);
        if (BD.out && (BD.out.t += dt / 950) >= 1) backdropEnd();
      }
    } catch (err) {
      // never leave the player stuck mid-fight: skip whatever broke and carry on
      console.error("[warpath]", err);
      SHAKE = [0, 0];
      const D = V.duel;
      const M = V.mon;
      V.duel = V.mon = null;
      V.scene = "map";
      V.banner = null;
      if (D && D.done) D.done();
      else if (M && M.done) M.done();
    }
    rafId = requestAnimationFrame(frame);
  }
  const kick = () => rafId || (rafId = requestAnimationFrame(frame));

  // =====================================================================
  // Game state
  // =====================================================================
  const savedEmpire = store.get("empire", "maurya");
  const G = {
    mode: null, // "solo" | "room"
    empire: W.EMPIRES.includes(savedEmpire) ? savedEmpire : "maurya",
    level: store.get("level", 2),
    rounds: store.get("rounds", 7),
    events: [],
    idx: 0,
    results: [],
    monument: 0,
    guess: W.ast(1500),
    busy: false,
    clock: 0,
    infinite: false,
    lap: 0,
    daily: null,
  };
  const totalScore = () => G.results.reduce((s, r) => s + (r ? r.points : 0), 0);
  // the march: each moment is an equal stretch of road, and you cover your share of its points
  const LAP = 10; // an infinite march walks the road in laps of 10 moments
  const rawProgress = (results, n) => results.reduce((s, r) => s + (r && r.max ? r.points / r.max : 0), 0) / n;
  function progressOf(results, n) {
    if (!G.infinite) return clamp(rawProgress(results, n), 0, 1);
    const raw = rawProgress(results, LAP);
    const lap = Math.floor(raw);
    if (lap !== G.lap) {
      G.lap = lap;
      V.gProg = 0; // back to the start of the road for the next lap
    }
    return raw - lap;
  }
  function setEmpire(key) {
    G.empire = W.EMPIRES.includes(key) ? key : "maurya";
    makeWarrior(EMP[G.empire].warrior);
    refit(true);
  }
  setEmpire(G.empire);

  // the year slider: more room for recent centuries
  const STOPS = [[0, -3499], [120, -499], [250, 500], [420, 1500], [580, 1800], [700, 1900], [1000, 2026]];
  const posToAst = (p) => {
    for (let i = 1; i < STOPS.length; i++) if (p <= STOPS[i][0]) return Math.round(lerp(STOPS[i - 1][1], STOPS[i][1], (p - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0])));
    return 2026;
  };
  const astToPos = (a) => {
    for (let i = 1; i < STOPS.length; i++) if (a <= STOPS[i][1]) return lerp(STOPS[i - 1][0], STOPS[i][0], (a - STOPS[i - 1][1]) / (STOPS[i][1] - STOPS[i - 1][1]));
    return 1000;
  };
  const clampAst = (a) => clamp(a, W.ast(W.MIN_YEAR), W.ast(W.MAX_YEAR));

  // =====================================================================
  // Panels: they float over the full-screen map, and the ▾ button tucks them away
  // =====================================================================
  function setTop(meta, score) {
    $("#wpMeta").textContent = meta || "";
    $("#wpScore").textContent = score == null ? "" : `${fmt(score)} pts`;
  }
  function btn(label, cls, fn) {
    const b = el("button", "wp-btn" + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }
  function showPanel(card) {
    panel.classList.remove("min");
    const tuck = el("button", "wp-tuck", "▾");
    tuck.type = "button";
    tuck.title = "Hide this panel to see the map";
    tuck.setAttribute("aria-label", "Hide panel");
    tuck.addEventListener("click", () => {
      const min = panel.classList.toggle("min");
      tuck.textContent = min ? "▴" : "▾";
      tuck.setAttribute("aria-label", min ? "Show panel" : "Hide panel");
      scheduleRefit();
    });
    card.prepend(tuck);
    panel.replaceChildren(card);
    scheduleRefit();
  }
  let refitT = 0;
  function scheduleRefit() {
    clearTimeout(refitT);
    refitT = setTimeout(() => refit(false), 60);
  }
  if (window.ResizeObserver) new ResizeObserver(scheduleRefit).observe(panel);

  function levelPicker(value, editable, onChange) {
    const g = el("div", "wp-field");
    const lab = el("div", "wp-label");
    const name = el("b");
    const desc = el("div", "wp-sub");
    const show = (v) => {
      lab.replaceChildren("Difficulty: ", name);
      name.textContent = W.LEVEL_NAMES[v];
      desc.textContent = ["", "Household-name moments", "Mostly famous moments", "Takes some history", "For history buffs", "Deep cuts for experts"][v];
    };
    const r = el("input", "wp-range");
    r.type = "range";
    r.min = "1";
    r.max = "5";
    r.step = "1";
    r.value = String(value);
    r.disabled = !editable;
    r.setAttribute("aria-label", "Difficulty");
    r.addEventListener("input", () => show(Number(r.value)));
    r.addEventListener("change", () => onChange(Number(r.value)));
    const ends = el("div", "wp-ends");
    ends.append(el("span", null, "Recruit"), el("span", null, "Legend"));
    g.append(lab, r, ends, desc);
    show(value);
    return g;
  }
  function segPicker(title, opts, value, editable, onChange) {
    const g = el("div", "wp-field");
    g.append(el("div", "wp-label", title));
    const row = el("div", "wp-seg");
    for (const [v, label] of opts) {
      const b = el("button", "wp-chip" + (v === value ? " on" : ""), label);
      b.type = "button";
      b.disabled = !editable;
      b.setAttribute("aria-pressed", String(v === value));
      b.addEventListener("click", () => v !== value && onChange(v));
      row.append(b);
    }
    g.append(row);
    return g;
  }
  let empiresOpen = false; // the full list folds away to a single line
  function empirePicker(value, editable, onChange) {
    const g = el("div", "wp-field");
    const head = el("div", "wp-emp-head");
    head.append(el("div", "wp-label", "March for"));
    const cur = EMP[value];
    const toggle = el("button", "wp-emp-current" + (empiresOpen ? " open" : ""));
    toggle.type = "button";
    toggle.disabled = !editable;
    toggle.style.setProperty("--emp", shade(cur.color, 1.5));
    toggle.setAttribute("aria-expanded", String(empiresOpen));
    toggle.append(el("b", null, cur.name), el("span", null, `${cur.king} · build the ${cur.monumentName}`), el("i", null, editable ? (empiresOpen ? "Close ▴" : "Change ▾") : ""));
    g.append(head, toggle);
    const grid = el("div", "wp-empires");
    grid.hidden = !empiresOpen;
    toggle.addEventListener("click", () => {
      empiresOpen = !empiresOpen;
      grid.hidden = !empiresOpen;
      toggle.classList.toggle("open", empiresOpen);
      toggle.setAttribute("aria-expanded", String(empiresOpen));
      toggle.lastChild.textContent = empiresOpen ? "Close ▴" : "Change ▾";
    });
    for (const key of W.EMPIRES) {
      const e = EMP[key];
      const b = el("button", "wp-emp" + (key === value ? " on" : ""));
      b.type = "button";
      b.disabled = !editable;
      b.style.setProperty("--emp", shade(e.color, 1.5));
      b.setAttribute("aria-pressed", String(key === value));
      b.append(el("b", null, e.name), el("span", null, `${e.king} · ${e.when}`), el("i", null, `Build the ${e.monumentName}`));
      b.addEventListener("click", () => {
        empiresOpen = false;
        if (key !== value) onChange(key);
        else {
          grid.hidden = true;
          toggle.classList.remove("open");
          toggle.lastChild.textContent = "Change ▾";
        }
      });
      grid.append(b);
    }
    g.append(grid);
    return g;
  }
  const ROUND_OPTS = [5, 7, 10, 15, 20].map((n) => [n, String(n)]);
  const SOLO_ROUND_OPTS = [...ROUND_OPTS, [0, "∞"]]; // 0 = infinite
  const TIMER_OPTS = [0, 20, 30, 45, 60, 90].map((t) => [t, t ? `${t}s` : "No clock"]);

  function resetMarch() {
    V.scene = "map";
    V.target = null;
    V.foe = null;
    V.duel = V.mon = null;
    V.prog = V.gProg = 0;
    G.results = [];
    G.monument = 0;
  }
  function showIntro() {
    G.mode = null;
    G.infinite = false;
    G.daily = null;
    const pref = store.get("empire", G.empire);
    if (W.EMPIRES.includes(pref) && pref !== G.empire) setEmpire(pref);
    G.busy = false;
    resetMarch();
    setTop("Guess the year", null);
    const emp = EMP[G.empire];
    const h = el("div", "wp-card");
    h.append(el("p", "wp-eyebrow", "Warpath · guess the year"));
    h.append(el("h2", "wp-title", `March for the ${emp.name}.`));
    h.append(el("p", "wp-lede", `Each moment in history puts one of ${emp.king}'s real enemies, or a wild beast, in your way. Name the year: the closer you get, the harder you strike and the further you march. Hit the exact year, or come close on a hard one, to raise the ${emp.monumentName}.`));
    h.append(empirePicker(G.empire, true, (k) => (store.set("empire", k), setEmpire(k), showIntro())));
    h.append(levelPicker(G.level, true, (v) => (store.set("level", (G.level = v)), showIntro())));
    h.append(segPicker("Questions", SOLO_ROUND_OPTS, G.rounds, true, (v) => (store.set("rounds", (G.rounds = v)), showIntro())));
    const acts = el("div", "wp-actions");
    acts.append(btn("March solo ▶", "primary", startSolo), btn("War room with friends", "", () => showRoomJoin()));
    h.append(acts);
    const best = store.get("best", null);
    if (best && best.score != null) h.append(el("p", "wp-sub center", `Your best: ${fmt(best.score)} pts (${W.LEVEL_NAMES[best.level] || ""}, ${best.rounds} questions)`));
    h.append(tierLegend());
    showPanel(h);
    kick();
  }
  function tierLegend() {
    const ul = el("ul", "wp-tiers");
    for (const t of W.TIERS.slice(0, 5)) {
      const li = el("li");
      li.append(el("span", "wp-tdot t-" + t.key), el("span", null, `${t.what}: ${t.label}`), el("b", null, `${t.points}+`));
      ul.append(li);
    }
    const li = el("li", "wp-tnote");
    li.append(el("span", null, `Harder moments multiply the points: ×1 for household names up to ×${W.MULT[5]} for deep cuts.`));
    ul.append(li);
    return ul;
  }

  // ---------- solo ----------
  // more moments for the march, avoiding ones seen lately
  function drawMore(n) {
    const seen = new Set([...store.get("seen", []), ...G.events.map((e) => e.id)]);
    const more = W.draw(Math.random, n, G.level, seen);
    store.set("seen", [...seen, ...more.map((e) => e.id)].slice(-300));
    return more;
  }
  const marchLength = () => (G.infinite ? Infinity : G.events.length);
  // Today's Avdle, part 3: three dates, the same for everyone today (empire rotates by day)
  function startDailyMarch(d) {
    G.daily = d;
    G.mode = "solo";
    G.infinite = false;
    G.lap = 0;
    setEmpire(W.EMPIRES[d.number % W.EMPIRES.length]);
    G.events = W.draw(seeded(hash(`avdle-years-${d.key}`)), 3, 2);
    resetMarch();
    G.results = store.get("daily." + d.key, []).slice(0, 3);
    G.monument = Math.min(MONUMENT_STAGES, G.results.filter((r) => r && r.monument).length);
    G.idx = G.results.length;
    if (G.idx >= G.events.length) return finishDaily();
    showQuestion(G.events[G.idx], G.idx, G.events.length);
  }
  function finishDaily() {
    const d = G.daily;
    G.daily = null;
    G.mode = null;
    stopClock();
    root.hidden = true;
    document.body.classList.remove("wp-open");
    if (d && d.onDone) d.onDone();
  }
  function startSolo() {
    G.mode = "solo";
    G.daily = null;
    G.infinite = G.rounds === 0;
    G.lap = 0;
    G.events = [];
    G.events = drawMore(G.infinite ? LAP : G.rounds);
    G.idx = 0;
    resetMarch();
    showQuestion(G.events[0], 0, marchLength());
  }

  // ev is a full event (solo) or a room clue ({ text, cat, fame })
  function showQuestion(ev, i, n, timeLeft) {
    G.busy = false;
    V.scene = "map";
    V.prog = progressOf(G.results, n);
    V.target = clamp(V.prog + 1 / (n === Infinity ? LAP : n), 0, 1);
    V.foe = pickFoe(G.empire, ev, i, n);
    if (pvp()) {
      const others = roomPlayers().filter((p) => p.id !== MP.me);
      V.foe = rivalFoe(others[i % others.length]);
    }
    setTop(`${momentLabel(i, n)}${G.mode === "room" && MP.room ? " · Room " + MP.room.code : ""}`, totalScore());
    const card = el("form", "wp-card wp-q");
    card.autocomplete = "off";
    const top = el("div", "wp-qtop");
    const mult = W.MULT[ev.fame] || 1;
    top.append(el("span", "wp-cat", W.CATS[ev.cat] || ev.cat));
    if (mult > 1) top.append(el("span", "wp-mult", `×${mult} points`));
    top.append(el("span", "wp-beast", V.foe.rival ? `⚔ One-on-one with ${V.foe.name}` : `${V.foe.boss ? "Boss: " : ""}${V.foe.name} blocks the road`));
    const clock = el("span", "wp-clock");
    clock.hidden = true;
    top.append(clock);
    card.append(top, el("h2", "wp-moment", ev.text));

    const row = el("div", "wp-yearrow");
    const mk = (label) => {
      const b = el("button", "wp-step", label);
      b.type = "button";
      return b;
    };
    const minus10 = mk("−10");
    const minus = mk("−1");
    const plus = mk("+1");
    const plus10 = mk("+10");
    const inp = el("input", "wp-yearin");
    inp.inputMode = "numeric";
    inp.setAttribute("aria-label", "Year");
    inp.maxLength = 4;
    const era = el("button", "wp-era");
    era.type = "button";
    era.setAttribute("aria-label", "Switch BC or AD");
    row.append(minus10, minus, inp, era, plus, plus10);
    const range = el("input", "wp-range wp-yearslider");
    range.type = "range";
    range.min = "0";
    range.max = "1000";
    range.step = "1";
    range.setAttribute("aria-label", "Year slider");
    const ticks = el("div", "wp-ticks");
    for (const [p, label] of [[0, "3500 BC"], [120, "500 BC"], [250, "AD 500"], [420, "1500"], [580, "1800"], [700, "1900"], [1000, "2026"]]) {
      const t = el("span", null, label);
      t.style.left = p / 10 + "%";
      ticks.append(t);
    }
    const render = (fromInput) => {
      const y = W.fromAst(G.guess);
      if (!fromInput) inp.value = String(Math.abs(y));
      era.textContent = y < 0 ? "BC" : "AD";
      era.classList.toggle("bc", y < 0);
      range.value = String(Math.round(astToPos(G.guess)));
    };
    const setAst = (a) => {
      G.guess = clampAst(a);
      render();
    };
    minus10.onclick = () => setAst(G.guess - 10);
    minus.onclick = () => setAst(G.guess - 1);
    plus.onclick = () => setAst(G.guess + 1);
    plus10.onclick = () => setAst(G.guess + 10);
    era.onclick = () => setAst(W.ast(-W.fromAst(G.guess) || 1));
    range.addEventListener("input", () => {
      G.guess = clampAst(posToAst(Number(range.value)));
      render();
    });
    inp.addEventListener("input", () => {
      inp.value = inp.value.replace(/\D/g, "").slice(0, 4);
      const v = Number(inp.value);
      if (!v) return;
      const bc = W.fromAst(G.guess) < 0;
      G.guess = clampAst(W.ast(bc ? -v : v));
      render(true);
    });
    inp.addEventListener("focus", () => inp.select());
    card.append(row, range, ticks);
    const go = el("button", "wp-btn primary wp-strike", "Strike! ⚔");
    go.type = "submit";
    const acts = el("div", "wp-actions");
    acts.append(go);
    card.append(acts);
    card.addEventListener("submit", (e) => {
      e.preventDefault();
      submit(W.fromAst(G.guess));
    });
    showPanel(card);
    render();
    setTimeout(() => matchMedia("(pointer: fine)").matches && inp.focus(), 50);

    stopClock();
    if (timeLeft != null) {
      // timeLeft: { left, startsIn, total } in ms (rooms only)
      clock.hidden = false;
      const deadline = Date.now() + timeLeft.left;
      const total = timeLeft.total || timeLeft.left;
      let sent = false;
      const tick = () => {
        const ms = deadline - Date.now();
        const s = Math.max(0, Math.ceil(Math.min(ms, total) / 1000));
        clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
        clock.classList.toggle("low", s <= 5);
        if (ms <= 700 && !sent) {
          sent = true;
          submit(W.fromAst(G.guess));
        }
      };
      tick();
      G.clock = setInterval(tick, 250);
    }
    kick();
  }
  const stopClock = () => clearInterval(G.clock);
  const momentLabel = (i, n) => (G.daily ? `Today's Avdle #${G.daily.number} · date ${i + 1} of ${n}` : n === Infinity ? `∞ Moment ${i + 1}${G.lap ? ` · lap ${G.lap + 1}` : ""}` : `Moment ${i + 1} of ${n}`);

  function submit(year) {
    stopClock();
    if (G.mode === "solo") {
      const ev = G.events[G.idx];
      const res = { ...W.judge(ev, year), guess: year, y: ev.y, event: ev.id };
      G.results[G.idx] = res;
      if (G.daily) store.set("daily." + G.daily.key, G.results);
      playResult(res, ev, G.idx, marchLength());
    } else if (G.mode === "room" && MP.room) {
      MP.sentRound = MP.room.round;
      mpSend({ t: "year", round: MP.room.round, year });
      showWaiting();
    }
  }

  // the fight, then (maybe) the monument, then the answer card
  function playResult(res, ev, i, n) {
    G.busy = true;
    let foe = V.foe || pickFoe(G.empire, ev, i, n);
    let tier = res.tier;
    let label = null;
    if (res.all && res.all.length > 1) {
      // one-on-one: you against the best of the others this round
      const me = res.all.find((p) => p.id === MP.me) || { points: res.points };
      const rival = rivalOf(res.all, MP.me);
      foe = rivalFoe(rival);
      const diff = (me.points || 0) - (rival.points || 0);
      const score = `YOU +${fmt(me.points || 0)} · ${rival.name.toUpperCase()} +${fmt(rival.points || 0)}`;
      if (diff > 0) {
        tier = Math.min(res.tier, 2);
        label = { big: res.tier === 0 ? "CRUSHED!" : "YOU WIN", small: score, color: C.gold };
      } else if (diff < 0) {
        tier = 4;
        label = { big: `${rival.name} WINS`, small: score, color: C.red };
      } else {
        tier = 3;
        label = { big: "DRAW", small: score, color: C.ember };
      }
    }
    const card = el("div", "wp-card wp-fighting");
    card.append(el("p", "wp-eyebrow", "Your year: " + (res.guess != null ? W.yearText(res.guess) : "none")), el("p", "wp-sub", `Fighting the ${foe.name}…`));
    card.append(
      btn("Skip ▸▸", "ghost", () => {
        if (V.duel) V.duel.t = V.duel.end;
        else if (V.mon) V.mon.t = V.mon.end;
      })
    );
    showPanel(card);
    const place = placeAt(V.target != null ? V.target : V.prog);
    duelLabel = label;
    startDuel(tier, foe, place, () => {
      V.prog = progressOf(G.results, n);
      V.target = null;
      const after = () => showReveal(res, ev, i, n);
      if (res.monument && G.monument < MONUMENT_STAGES) {
        const from = G.monument;
        G.monument++;
        startMonumentRise(from, G.monument, after);
      } else after();
    });
    kick();
  }

  function revealCard(res, ev) {
    const t = W.TIERS[res.tier];
    const card = el("div", "wp-card wp-reveal");
    const head = el("div", "wp-rhead");
    head.append(el("span", "wp-tier t-" + t.key, t.label), el("strong", "wp-pts", `+${fmt(res.points)}`));
    card.append(head);
    if (res.mult > 1 && res.points) card.append(el("p", "wp-sub", `Includes ×${res.mult} for a harder moment.`));
    if (res.monument) card.append(el("p", "wp-monline", `🏛 The ${EMP[G.empire].monumentName} rises: ${Math.min(G.monument, MONUMENT_STAGES)}/${MONUMENT_STAGES}`));
    card.append(el("p", "wp-moment small", ev.text));
    const yr = el("div", "wp-years");
    const box = (label, value) => {
      const b = el("div", "wp-ybox");
      b.append(el("span", null, label), el("b", null, value));
      return b;
    };
    yr.append(
      box("It happened in", W.yearText(ev.y)),
      box("You said", res.guess != null ? W.yearText(res.guess) : "—"),
      box("Off by", res.off == null ? "—" : res.off === 0 ? "0 🎯" : `${fmt(res.off)} yr${res.off === 1 ? "" : "s"}`)
    );
    card.append(yr);
    const fact = W.factText(ev);
    if (fact) card.append(el("p", "wp-fact", fact));
    const bd = W.bands(ev.y);
    card.append(el("p", "wp-sub", `For this moment: within ${bd.close} yr${bd.close === 1 ? "" : "s"} is close, ${bd.near} is near, ${bd.rough} is rough.`));
    return card;
  }

  function roundTable(res) {
    const rows = res.all.slice().sort((a, b) => b.points - a.points);
    const top = rows[0].points;
    const box = el("div", "wp-roundtable");
    box.append(el("div", "wp-label", "This round"));
    for (const p of rows) {
      const row = el("div", "wp-rt-row" + (p.id === MP.me ? " me" : "") + (p.points === top && top > 0 ? " win" : ""));
      const emp = EMP[p.empire];
      row.append(
        el("span", "wp-rt-name", `${p.points === top && top > 0 ? "🏆 " : ""}${p.id === MP.me ? "You" : p.name}`),
        el("span", "wp-rt-emp", emp ? emp.name.replace(/ Empire$/, "") : ""),
        el("span", "wp-rt-year", p.guess != null ? W.yearText(p.guess) : "—"),
        el("b", null, `+${fmt(p.points)}`),
        el("span", "wp-rt-total", `${fmt(p.score)} total`)
      );
      box.append(row);
    }
    const me = res.all.find((p) => p.id === MP.me);
    const rival = rivalOf(res.all, MP.me);
    if (me && rival) {
      const d = me.points - rival.points;
      box.append(el("p", "wp-sub", d > 0 ? `You beat ${rival.name} by ${fmt(d)} points this round.` : d < 0 ? `${rival.name} beat you by ${fmt(-d)} points this round.` : `You and ${rival.name} scored the same.`));
    }
    return box;
  }
  function showReveal(res, ev, i, n) {
    G.busy = true;
    setTop(momentLabel(i, n), totalScore());
    const card = revealCard(res, ev);
    if (res.all && res.all.length > 1) card.insertBefore(roundTable(res), card.querySelector(".wp-years"));
    const acts = el("div", "wp-actions");
    const lastQ = i + 1 >= n;
    const next = btn(lastQ ? (G.daily ? "See today's results ▶" : "See the march ▶") : "Next moment ▶", "primary", () => {
      if (G.mode === "solo") {
        if (lastQ) return G.daily ? finishDaily() : showEnd();
        G.idx++;
        if (G.idx >= G.events.length) G.events.push(...drawMore(LAP));
        showQuestion(G.events[G.idx], G.idx, n);
      } else mpAdvance();
    });
    acts.append(next);
    if (G.mode === "solo" && G.infinite) acts.append(btn("End the march", "ghost", showEnd));
    card.append(acts);
    showPanel(card);
    if (G.mode === "room") updateNextButton();
    setTimeout(() => next.focus(), 30);
  }

  function shareText(results, level) {
    const score = results.reduce((s, r) => s + (r ? r.points : 0), 0);
    const emp = EMP[G.empire];
    return `Warpath ⚔ ${emp.name} · ${W.LEVEL_NAMES[level]} · ${fmt(score)} pts\n${results.map((r) => W.TIERS[r ? r.tier : 5].emoji).join("")}  🏛 ${emp.monumentName} ${G.monument}/${MONUMENT_STAGES}\n${location.origin}${location.pathname}?warpath=1`;
  }
  function monumentSummary() {
    const emp = EMP[G.empire];
    if (G.monument >= MONUMENT_STAGES) return `You completed the ${emp.monumentName}! 🏛`;
    if (G.monument) return `You raised the ${emp.monumentName} to ${G.monument}/${MONUMENT_STAGES}.`;
    return `Hit an exact year, or come close on a hard moment, to start building the ${emp.monumentName}.`;
  }

  function showEnd() {
    G.busy = false;
    const n = G.results.filter(Boolean).length;
    const score = totalScore();
    V.prog = progressOf(G.results, G.infinite ? Infinity : n);
    V.target = null;
    V.foe = null;
    setTop("The march is over", score);
    const best = store.get("best", null);
    const isBest = !G.infinite && (!best || best.score == null || score > best.score);
    if (isBest) store.set("best", { score, level: G.level, rounds: n });
    const emp = EMP[G.empire];
    const card = el("div", "wp-card");
    card.append(el("p", "wp-eyebrow", `${emp.name} · ${W.LEVEL_NAMES[G.level]} · ${n} moments${isBest ? " · new best!" : ""}`));
    card.append(el("h2", "wp-title", `${fmt(score)} pts`));
    const road = G.infinite && G.lap ? `${G.lap} full lap${G.lap === 1 ? "" : "s"} of ${emp.king}'s road and ${Math.round(V.prog * 100)}% more` : `${Math.round(V.prog * 100)}% of ${emp.king}'s road`;
    card.append(el("p", "wp-lede", `You marched ${road} and reached ${placeAt(V.prog)}. ${monumentSummary()}`));
    card.append(el("p", "wp-emoji", G.results.map((r) => W.TIERS[r.tier].emoji).join("")));
    const acts = el("div", "wp-actions");
    acts.append(
      btn("March again ▶", "primary", startSolo),
      btn("Copy result", "", async () => {
        try {
          await navigator.clipboard.writeText(shareText(G.results, G.level));
          status("Copied!");
        } catch {
          status("Couldn't copy.");
        }
      }),
      btn("Change empire or difficulty", "ghost", showIntro)
    );
    card.append(acts);
    const st = el("p", "wp-status");
    st.id = "wpStatus";
    card.append(st, resultList(G.events.slice(0, n), G.results));
    showPanel(card);
  }
  function resultList(events, results) {
    const ol = el("ol", "wp-list");
    events.forEach((ev, i) => {
      const r = results[i];
      if (!r) return;
      const li = el("li");
      li.append(el("span", "wp-tdot t-" + W.TIERS[r.tier].key), el("span", "wp-li-text", ev.text), el("span", "wp-li-year", `${W.yearText(ev.y)} · you: ${r.guess != null ? W.yearText(r.guess) : "—"}${r.monument ? " · 🏛" : ""}`), el("b", null, `+${fmt(r.points)}`));
      ol.append(li);
    });
    return ol;
  }
  function status(msg) {
    const s = $("#wpStatus");
    if (!s) return;
    s.textContent = msg;
    clearTimeout(status.id);
    status.id = setTimeout(() => (s.textContent = ""), 2500);
  }

  // =====================================================================
  // War rooms (multiplayer). Warpath rooms only play Warpath.
  // =====================================================================
  const MP = { ws: null, creds: store.get("creds", null), room: null, me: null, shownRound: -1, sentRound: -1, retry: 0 };
  const canMulti = /^https?:$/.test(location.protocol);
  function mpConnect(onOpen) {
    clearTimeout(MP.retry);
    if (MP.ws) {
      MP.ws.onclose = null;
      MP.ws.close();
    }
    const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
    MP.ws = ws;
    ws.onopen = onOpen;
    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      try {
        mpHandle(m);
      } catch (err) {
        console.error("[warpath]", err);
      }
    };
    ws.onclose = () => {
      if (MP.ws !== ws) return;
      MP.ws = null;
      if (MP.creds && !root.hidden) {
        status("Reconnecting…");
        MP.retry = setTimeout(() => mpConnect(() => mpSend({ t: "rejoin", ...MP.creds })), 1500);
      }
    };
  }
  function mpSend(m) {
    if (MP.ws && MP.ws.readyState === 1) MP.ws.send(JSON.stringify({ ...m, game: "warpath" }));
  }
  function mpLeave() {
    if (MP.ws) {
      mpSend({ t: "leave" });
      MP.ws.onclose = null;
      MP.ws.close();
    }
    MP.ws = null;
    MP.creds = null;
    MP.room = null;
    store.set("creds", null);
    const u = new URL(location.href);
    if (u.searchParams.has("war")) {
      u.searchParams.delete("war");
      history.replaceState(null, "", u);
    }
  }
  function newRoomGame() {
    G.results = [];
    G.monument = 0;
    MP.shownRound = -1;
    MP.sentRound = -1;
    V.prog = V.gProg = 0;
  }
  function mpHandle(m) {
    if (m.t === "joined") {
      MP.me = m.id;
      MP.creds = { code: m.code, id: m.id, token: m.token };
      store.set("creds", MP.creds);
      const u = new URL(location.href);
      u.searchParams.set("war", m.code);
      history.replaceState(null, "", u);
      return;
    }
    if (m.t === "error") return status(m.msg);
    if (m.t === "gone") {
      MP.creds = null;
      store.set("creds", null);
      return showRoomJoin(null, "That room has closed.");
    }
    if (m.t === "result") {
      G.results[m.round] = m;
      const ev = W.LIST[m.event];
      if (ev) playResult(m, ev, m.round, m.rounds);
      return;
    }
    if (m.t === "room") {
      m.recvAt = Date.now();
      const prev = MP.room;
      MP.room = m;
      G.mode = "room";
      const mine = m.players && m.players.find((p) => p.id === (m.you || MP.me));
      if (m.you) MP.me = m.you;
      if (mine && mine.empire && mine.empire !== G.empire) setEmpire(mine.empire);
      if (m.state === "round" && (!prev || prev.state !== "round" || (m.round === 0 && MP.shownRound > 0))) newRoomGame();
      if (G.busy) return updateNextButton(); // let the fight and the answer card finish first
      mpRender();
    }
  }
  function updateNextButton() {
    const r = MP.room;
    const b = panel.querySelector(".wp-reveal .wp-btn.primary");
    if (b && r && r.state === "over") b.textContent = "Final standings ▶";
  }
  function mpAdvance() {
    G.busy = false;
    mpRender();
  }
  function mpRender() {
    const r = MP.room;
    if (!r) return;
    if (r.state === "lobby") return showRoomLobby();
    if (r.state === "over") return showRoomOver();
    if (r.state === "round") {
      if (MP.sentRound === r.round || G.results[r.round]) return showWaiting();
      if (MP.shownRound === r.round && panel.querySelector(".wp-q")) return; // still answering
      MP.shownRound = r.round;
      // the clock is counted from when this update arrived, so time spent on the fight isn't lost twice
      const since = Date.now() - (r.recvAt || Date.now());
      const clock = r.timeLeft == null ? null : { left: Math.max(0, r.timeLeft - since), startsIn: Math.max(0, (r.clockIn || 0) - since), total: (r.settings.timer || 0) * 1000 };
      showQuestion(r.clue, r.round, r.rounds, clock);
    }
  }
  function showWaiting() {
    const r = MP.room;
    if (!r) return;
    setTop(`Moment ${r.round + 1} of ${r.rounds} · Room ${r.code}`, totalScore());
    const card = el("div", "wp-card");
    card.append(el("p", "wp-eyebrow", "Locked in"), el("p", "wp-lede", "Waiting for the others to answer…"));
    card.append(playerList(r, true));
    if (r.host === MP.me) {
      const acts = el("div", "wp-actions");
      acts.append(btn("Skip the slow ones", "ghost", () => mpSend({ t: "skip", round: r.round })));
      card.append(acts);
    }
    showPanel(card);
  }
  function playerList(r, showPicked) {
    const ul = el("ul", "wp-players");
    for (const p of r.players) {
      const li = el("li", p.connected ? "" : "off");
      li.append(el("span", "wp-pname", p.name + (p.id === MP.me ? " (you)" : "")));
      if (p.empire && EMP[p.empire]) {
        const tag = el("span", "wp-pemp", EMP[p.empire].name.replace(/ Empire$/, ""));
        tag.style.setProperty("--emp", shade(EMP[p.empire].color, 1.5));
        li.append(tag);
      }
      const tags = [p.id === r.host ? "host" : "", p.connected ? "" : "offline", showPicked ? (p.picked ? "✓ answered" : "thinking…") : ""].filter(Boolean).join(" · ");
      li.append(el("span", "wp-ptag", tags));
      ul.append(li);
    }
    return ul;
  }
  function showRoomJoin(code, msg) {
    G.mode = null;
    G.infinite = false;
    G.busy = false;
    resetMarch();
    setTop("War room", null);
    const card = el("div", "wp-card");
    card.append(el("p", "wp-eyebrow", "Warpath · with friends"), el("h2", "wp-title small", "War room"));
    card.append(el("p", "wp-lede", "Everyone gets the same moments and fights the same enemies. The standings come at the end. This room only plays Warpath."));
    if (!canMulti) {
      card.append(el("p", "wp-sub", "War rooms need the Avdle server. Run npm start and open the page from it."));
      card.append(btn("← Back", "ghost", showIntro));
      return showPanel(card);
    }
    const nameField = el("label", "wp-field");
    nameField.append(el("span", "wp-label", "Your name"));
    const name = el("input", "wp-input");
    name.maxLength = 20;
    name.placeholder = "Warrior";
    name.value = store.get("name", "");
    nameField.append(name);
    card.append(nameField);
    const settings = { rounds: G.rounds || 7, level: G.level, timer: store.get("timer", 0), empire: G.empire };
    const box = el("div", "wp-settings");
    const drawSettings = () =>
      box.replaceChildren(
        empirePicker(settings.empire, true, (k) => ((settings.empire = k), store.set("empire", k), setEmpire(k), drawSettings())),
        levelPicker(settings.level, true, (v) => ((settings.level = v), store.set("level", (G.level = v)), drawSettings())),
        segPicker("Questions", ROUND_OPTS, settings.rounds, true, (v) => ((settings.rounds = v), store.set("rounds", (G.rounds = v)), drawSettings())),
        segPicker("Time per moment", TIMER_OPTS, settings.timer, true, (v) => ((settings.timer = v), store.set("timer", v), drawSettings()))
      );
    drawSettings();
    card.append(box);
    const getName = () => {
      const n = name.value.trim().slice(0, 20) || "Warrior";
      store.set("name", n);
      return n;
    };
    const acts = el("div", "wp-actions");
    acts.append(
      btn("Create a war room", "primary", () => {
        status("Creating room…");
        const n = getName();
        mpConnect(() => mpSend({ t: "create", name: n, settings, empire: settings.empire }));
      })
    );
    card.append(acts);
    const join = el("div", "wp-join");
    const codeIn = el("input", "wp-input wp-code");
    codeIn.maxLength = 4;
    codeIn.placeholder = "CODE";
    codeIn.autocapitalize = "characters";
    codeIn.value = code ? String(code).toUpperCase().slice(0, 4) : "";
    const doJoin = () => {
      const c = codeIn.value.trim().toUpperCase();
      if (!/^[A-Z]{4}$/.test(c)) return status("Room codes are 4 letters.");
      status("Joining…");
      const n = getName();
      mpConnect(() => mpSend({ t: "join", code: c, name: n, empire: G.empire }));
    };
    codeIn.addEventListener("keydown", (e) => e.key === "Enter" && doJoin());
    join.append(el("span", "wp-label", "Or join one"), codeIn, btn("Join", "", doJoin));
    card.append(join);
    const st = el("p", "wp-status", msg || "");
    st.id = "wpStatus";
    card.append(st, btn("← Back", "ghost", showIntro));
    showPanel(card);
    (code && name.value ? codeIn : name).focus();
  }
  function showRoomLobby() {
    const r = MP.room;
    G.busy = false;
    resetMarch();
    setTop(`Room ${r.code}`, null);
    const card = el("div", "wp-card");
    card.append(el("p", "wp-eyebrow", "War room code"), el("h2", "wp-title wp-roomcode", r.code));
    const acts = el("div", "wp-actions");
    acts.append(
      btn("Copy invite link", "", async () => {
        const u = new URL(location.href);
        u.search = "?war=" + r.code;
        try {
          await navigator.clipboard.writeText(u.toString());
          status("Invite link copied.");
        } catch {
          status(u.toString());
        }
      }),
      btn("Leave room", "ghost", async () => {
        if (await ask("Leave the war room?", "Your friends can keep playing without you.", "Leave room", "Stay")) {
          mpLeave();
          showIntro();
        }
      })
    );
    card.append(acts);
    const isHost = r.host === MP.me;
    const s = r.settings;
    const change = (patch) => mpSend({ t: "settings", settings: { ...s, ...patch } });
    const mine = r.players.find((p) => p.id === MP.me);
    const myEmpire = (mine && mine.empire) || G.empire;
    card.append(el("p", "wp-sub", r.players.length > 1 ? "Every round is a one-on-one fight with a rival's warrior. The closer year wins." : "On your own you fight each empire's real enemies. Invite a friend to fight one-on-one."));
    card.append(
      empirePicker(myEmpire, true, (k) => {
        store.set("empire", k);
        setEmpire(k);
        mpSend({ t: "empire", empire: k });
      }),
      levelPicker(s.level, isHost, (v) => change({ level: v })),
      segPicker("Questions", ROUND_OPTS, s.rounds, isHost, (v) => change({ rounds: v })),
      segPicker("Time per moment", TIMER_OPTS, s.timer, isHost, (v) => change({ timer: v }))
    );
    if (!isHost) card.append(el("p", "wp-sub center", "The host sets the rules."));
    card.append(playerList(r, false));
    if (isHost) {
      const a2 = el("div", "wp-actions");
      a2.append(btn(r.players.length < 2 ? "Start (you can play solo too)" : `Start the march · ${r.players.length} warriors`, "primary", () => mpSend({ t: "start" })));
      card.append(a2);
    } else card.append(el("p", "wp-sub center", "Waiting for the host to start…"));
    const st = el("p", "wp-status");
    st.id = "wpStatus";
    card.append(st);
    showPanel(card);
  }
  function showRoomOver() {
    const r = MP.room;
    G.busy = false;
    const mine = r.players.find((p) => p.id === MP.me);
    V.prog = progressOf(G.results, r.rounds);
    V.target = null;
    V.foe = null;
    setTop(`Room ${r.code} · final`, mine ? mine.score : 0);
    const card = el("div", "wp-card");
    const ranked = [...r.players].sort((a, b) => b.score - a.score);
    card.append(el("p", "wp-eyebrow", `Final standings · ${EMP[G.empire].name}`), el("h2", "wp-title small", ranked[0] ? `${ranked[0].name} wins the war!` : "Game over"));
    const ol = el("ol", "wp-standings");
    for (const p of ranked) {
      const li = el("li", p.id === MP.me ? "me" : "");
      const mons = Math.min(MONUMENT_STAGES, (p.history || []).filter((h) => h && h.monument).length);
      li.append(el("span", "wp-pname", `${p.name}${p.empire && EMP[p.empire] ? ` · ${EMP[p.empire].name.replace(/ Empire$/, "")}` : ""}`), el("span", "wp-emoji small", (p.history || []).map((h) => W.TIERS[h ? h.tier : 5].emoji).join("") + (mons ? ` 🏛${mons}` : "")), el("b", null, fmt(p.score)));
      ol.append(li);
    }
    card.append(ol, el("p", "wp-sub", monumentSummary()));
    const acts = el("div", "wp-actions");
    if (r.host === MP.me) acts.append(btn("Rematch ▶", "primary", () => mpSend({ t: "start" })), btn("Change rules", "", () => mpSend({ t: "lobby" })));
    else acts.append(el("span", "wp-sub", "The host can start a rematch."));
    acts.append(btn("Leave room", "ghost", () => (mpLeave(), showIntro())));
    card.append(acts);
    const list = el("ol", "wp-list");
    (r.items || []).forEach((it, i) => {
      const ev = W.LIST[it.id];
      if (!ev) return;
      const li = el("li", "wp-roundrow");
      li.append(el("span", "wp-li-text", ev.text), el("span", "wp-li-year", W.yearText(ev.y)));
      const who = el("div", "wp-who");
      for (const p of ranked) {
        const h = (p.history || [])[i];
        who.append(el("span", "wp-whochip t-" + W.TIERS[h ? h.tier : 5].key, `${p.name}: ${h && h.guess != null ? W.yearText(h.guess) : "—"} (+${h ? fmt(h.points) : 0})`));
      }
      li.append(who);
      list.append(li);
    });
    card.append(list);
    const st = el("p", "wp-status");
    st.id = "wpStatus";
    card.append(st);
    showPanel(card);
  }

  // =====================================================================
  // Open / close
  // =====================================================================
  function open(opts = {}) {
    if (BD.on) backdropEnd();
    root.hidden = false;
    document.body.classList.add("wp-open");
    requestAnimationFrame(() => {
      if (opts.daily) startDailyMarch(opts.daily);
      else if (opts.room) showRoomJoin();
      else if (opts.infinite) {
        G.rounds = 0;
        store.set("rounds", 0);
        startSolo();
      } else if (opts.code) {
        if (MP.creds && MP.creds.code === opts.code.toUpperCase()) {
          showRoomJoin(opts.code, "Reconnecting…");
          mpConnect(() => mpSend({ t: "rejoin", ...MP.creds }));
        } else showRoomJoin(opts.code);
      } else if (!opts.room && !opts.infinite && !opts.daily) showIntro();
      resize();
      kick();
    });
  }
  // A small in-game modal (instead of the browser's confirm box).
  function ask(title, textStr, okLabel, cancelLabel) {
    return new Promise((resolve) => {
      $(".wp-modal", root)?.remove();
      const wrap = el("div", "wp-modal");
      wrap.setAttribute("role", "dialog");
      wrap.setAttribute("aria-modal", "true");
      const box = el("div", "wp-modal-box");
      box.append(el("h3", "wp-modal-title", title), el("p", "wp-modal-text", textStr));
      const acts = el("div", "wp-actions");
      const done = (v) => {
        wrap.remove();
        document.removeEventListener("keydown", onKey, true);
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          done(false);
        }
      };
      const ok = btn(okLabel, "danger", () => done(true));
      acts.append(btn(cancelLabel, "", () => done(false)), ok);
      box.append(acts);
      wrap.append(box);
      wrap.addEventListener("click", (e) => e.target === wrap && done(false));
      document.addEventListener("keydown", onKey, true);
      root.append(wrap);
      setTimeout(() => ok.focus(), 20);
    });
  }
  async function close() {
    const played = G.results.filter(Boolean).length;
    const midSolo = !G.daily && G.mode === "solo" && (G.infinite ? played > 0 && !panel.querySelector(".wp-list") : played < G.events.length);
    if (midSolo && !(await ask("Leave this march?", "Your progress in this game will be lost.", "Leave", "Keep marching"))) return;
    if (G.mode === "room" && MP.creds && !(await ask("Leave the war room?", "Your friends can keep playing without you.", "Leave room", "Stay"))) return;
    stopClock();
    if (MP.creds) mpLeave();
    G.mode = null;
    G.daily = null; // today's answers are saved; the daily resumes from the home card
    root.hidden = true;
    document.body.classList.remove("wp-open");
  }
  $("#wpExit").addEventListener("click", close);
  // Warpath's own animated how-to
  function showWarHelp() {
    $(".wp-modal", root)?.remove();
    const wrap = el("div", "wp-modal wp-howto");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    const box = el("div", "wp-modal-box");
    box.append(el("p", "wp-eyebrow", "How Warpath works"), el("h3", "wp-modal-title", "March to war through history"));
    const steps = [
      ["⚔", "Pick an empire", "13 empires, each with its real enemies, its road and its great monument."],
      ["📅", "Guess the year", "Each moment blocks your road with a foe. Set the year with the slider, the buttons or by typing."],
      ["💥", "Closer = bigger win", "Exact year: the foe bursts apart. Way off: it beats you. Hard moments score up to ×2."],
      ["🏛", "Build the wonder", "Exact years, or close calls on hard moments, raise the empire's monument piece by piece."],
    ];
    const ol = el("ol", "wp-ht-steps");
    steps.forEach(([icon, title, text], i) => {
      const li = el("li", "wp-ht-step");
      li.style.setProperty("--d", `${0.1 + i * 0.18}s`);
      const ico = el("span", "wp-ht-ico", icon);
      const words = el("div");
      words.append(el("b", null, title), el("span", null, text));
      li.append(ico, words);
      ol.append(li);
    });
    box.append(ol);
    const acts = el("div", "wp-actions");
    const ok = btn("Got it", "primary", () => wrap.remove());
    acts.append(ok);
    box.append(acts);
    wrap.append(box);
    wrap.addEventListener("click", (e) => e.target === wrap && wrap.remove());
    root.append(wrap);
    setTimeout(() => ok.focus(), 30);
  }
  $("#wpHelp").addEventListener("click", showWarHelp);
  root.addEventListener("keydown", (e) => {
    e.stopPropagation(); // keep Longshot's map keys out of this screen
    if (e.key === "Escape") {
      if (V.duel) V.duel.t = V.duel.end;
      else if (V.mon) V.mon.t = V.mon.end;
    }
  });
  let resizeT = 0;
  window.addEventListener("resize", () => {
    if (root.hidden) return;
    clearTimeout(resizeT);
    resizeT = setTimeout(resize, 120);
  });
  for (const b of document.querySelectorAll("[data-warpath]"))
    b.addEventListener("click", () => {
      b.closest("dialog")?.close();
      open();
    });

  // ---------- the "dot world" behind Avdle's Dates questions ----------
  function backdropShow(o) {
    const key = W.EMPIRES[hash(o.clue.text) % W.EMPIRES.length]; // the same kingdom for everyone in a room
    const already = BD.on && !BD.out;
    BD.on = true;
    BD.out = null;
    BD.area = o.area;
    root.classList.add("wp-backdrop");
    root.setAttribute("aria-hidden", "true");
    root.hidden = false;
    panel.replaceChildren();
    stopClock();
    G.mode = null;
    V.duel = V.mon = null;
    V.banner = null;
    P = [];
    if (!R.cols || !already) resize();
    setEmpire(key);
    const rng = seeded(hash(o.clue.text + "|road"));
    V.prog = V.gProg = 0.1 + rng() * 0.7;
    V.target = Math.min(1, V.prog + 0.12);
    V.foe = pickFoe(key, o.clue, o.index || 0, 99);
    V.scene = "map";
    BD.introT = already ? 1 : 0;
    kick();
    return { empire: EMP[key].name, foe: V.foe.name };
  }
  function backdropFight(tier) {
    if (!BD.on || BD.out || !V.foe) return;
    const place = placeAt(V.target != null ? V.target : V.prog);
    startDuel(tier, V.foe, place, () => {
      V.prog = Math.min(1, V.prog + 0.12 * Math.max(0, 4 - tier) / 4);
      V.target = null;
    });
    kick();
  }
  function backdropHide() {
    if (!BD.on || BD.out) return;
    V.duel = null;
    V.banner = null;
    BD.out = { t: 0 };
    kick();
  }
  function backdropEnd() {
    BD.on = false;
    BD.out = null;
    BD.area = null;
    root.hidden = true;
    root.classList.remove("wp-backdrop");
    root.removeAttribute("aria-hidden");
    V.target = null;
    R.view = null;
    const pref = store.get("empire", G.empire);
    if (W.EMPIRES.includes(pref)) G.empire = pref;
    makeWarrior(EMP[G.empire].warrior);
  }

  window.WarpathUI = { open, close, backdropShow, backdropFight, backdropHide };
  const qs = new URLSearchParams(location.search);
  if (qs.get("war")) open({ code: qs.get("war") });
  else if (qs.has("warpath")) open();
})();
