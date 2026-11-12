// Avdle rooms: the multiplayer game logic, shared by the Node server (server/server.js)
// and the Cloudflare Worker (worker/index.js, inside a Durable Object).
//
// The host hands each WebSocket to connect(ws) and passes its messages and its close to the
// returned { message, close }. A socket only needs ws.send(string), ws.close() and ws.readyState.
// The room owns its game: it draws the questions and judges every answer with the same engines the
// browser uses, so players can't see answers early or fake their scores.
"use strict";

// data first (each sets a global the engines read), then the engines
require("../data/countries.js");
require("../data/facts.js");
require("../data/people.js");
require("../data/events.js");
const E = require("../js/prompts.js");
const People = require("../js/people.js");
const W = require("../js/warpath.js");

// Web Crypto works in both Node and Workers
const randInt = (n) => {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] % n;
};
const randomId = () => globalThis.crypto.randomUUID().slice(0, 8);
const randomToken = () => {
  const a = new Uint8Array(16);
  globalThis.crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const ROUNDS = 5;
const MAX_PLAYERS = 8;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I / O
const rooms = new Map(); // code -> room

const newCode = () => {
  for (;;) {
    let c = "";
    for (let i = 0; i < 4; i++) c += CODE_CHARS[randInt(CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
};
const cleanName = (s) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 20) || "Explorer";

// Room settings, chosen by whoever creates the room (the host can change them in the lobby):
//   rounds: how many questions (3 to 20)
//   people: percentage of questions that are famous people (born/died here?); the rest are map questions
//   level:  how famous the people are: "rising" (gets harder), "easy", "medium", "hard"
//   timer:  seconds per question, 0 = no clock
// With no clock a round ends the moment every connected player has answered (or the
// host skips players who are away). With a clock it also ends when time runs out.
// cats: which kinds of question to play ("places", "people", "years"); more than one = a random mix
const CATS = ["places", "people", "years"];
const DEFAULT_SETTINGS = { rounds: ROUNDS, cats: ["places"], level: "rising", yearLevel: 2, timer: 0 };
const TIMERS = [0, 20, 30, 45, 60, 90];
const LEGACY_MODE = { places: 0, people: 100, mix: 50 };
function cleanSettings(x, prev = DEFAULT_SETTINGS) {
  const o = x && typeof x === "object" ? x : {};
  const rounds = Number.isInteger(o.rounds) && o.rounds >= 3 && o.rounds <= 20 ? o.rounds : prev.rounds;
  let cats = Array.isArray(o.cats) ? [...new Set(o.cats.filter((c) => CATS.includes(c)))] : null;
  if (!cats || !cats.length) {
    // older clients sent a people percentage or a mode
    const pct = Number.isFinite(o.people) ? o.people : o.mode in LEGACY_MODE ? LEGACY_MODE[o.mode] : null;
    cats = pct == null ? prev.cats : pct <= 0 ? ["places"] : pct >= 100 ? ["people"] : ["places", "people"];
  }
  return {
    rounds,
    cats,
    level: People.LEVELS.includes(o.level) ? o.level : prev.level,
    yearLevel: W.LEVELS.includes(o.yearLevel) ? o.yearLevel : prev.yearLevel || 2,
    timer: TIMERS.includes(o.timer) ? o.timer : prev.timer,
  };
}

// Warpath rooms (guess the year) are their own game: rounds, difficulty 1-5, clock.
const WAR_PAUSE = 10000; // ms between timed Warpath rounds, for the fight and the answer card
const WAR_DEFAULTS = { rounds: 7, level: 2, timer: 0, empire: "maurya" };
function cleanWarSettings(x, prev = WAR_DEFAULTS) {
  const o = x && typeof x === "object" ? x : {};
  return {
    rounds: Number.isInteger(o.rounds) && o.rounds >= 3 && o.rounds <= 20 ? o.rounds : prev.rounds,
    level: W.LEVELS.includes(o.level) ? o.level : prev.level,
    timer: TIMERS.includes(o.timer) ? o.timer : prev.timer,
    empire: W.EMPIRES.includes(o.empire) ? o.empire : prev.empire,
  };
}

function createRoom(settings, game) {
  const war = game === "warpath";
  const room = {
    code: newCode(),
    game: war ? "warpath" : "longshot",
    players: new Map(), // id -> { id, token, name, score, ws, connected, picks: [] }
    host: null,
    state: "lobby", // lobby | round | over
    settings: war ? cleanWarSettings(settings) : cleanSettings(settings),
    items: [], // one per round: { kind: "places", prompt } or { kind: "people", person }
    hints: new Set(), // players who asked for a hint this round
    round: -1,
    picks: new Map(), // id -> { country, lonlat } or { guess } for the current round
    deadline: 0,
    timerId: null,
    emptySince: null,
  };
  rooms.set(room.code, room);
  return room;
}

const roundsOf = (room) => room.items.length || ROUNDS;
const current = (room) => (room.state === "round" ? room.items[room.round] : null);

function snapshot(room, forId) {
  const item = current(room);
  const over = room.state === "over";
  return {
    t: "room",
    code: room.code,
    you: forId,
    host: room.host,
    state: room.state,
    settings: room.settings,
    round: room.round,
    rounds: roundsOf(room),
    kind: item ? item.kind : null,
    promptId: item && item.kind === "places" ? item.prompt.id : null,
    // people rounds: only dates and map points, never the name
    clue: item && item.kind === "people" ? People.clue(item.person) : item && item.kind === "year" ? W.clue(item.event) : null,
    game: room.game,
    timeLeft: item && room.deadline ? Math.max(0, room.deadline - Date.now()) : null,
    clockIn: item && room.deadline ? Math.max(0, (room.clockAt || 0) - Date.now()) : null,
    // what each round was, only once the game is over
    items: over ? room.items.map((x) => ({ kind: x.kind, id: x.kind === "places" ? x.prompt.id : x.kind === "year" ? x.event.id : x.person.id })) : undefined,
    players: [...room.players.values()].map((pl) => ({
      id: pl.id,
      name: pl.name,
      score: pl.score,
      connected: pl.connected,
      empire: pl.empire,
      picked: room.state === "round" ? room.picks.has(pl.id) : undefined,
      // what everyone chose, only once the game is over
      history: over ? pl.picks : undefined,
    })),
  };
}

function broadcast(room) {
  for (const pl of room.players.values()) if (pl.connected) send(pl.ws, snapshot(room, pl.id));
}
function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function startGame(room) {
  if (room.game === "warpath") {
    room.items = W.draw(Math.random, room.settings.rounds, room.settings.level).map((event) => ({ kind: "year", event }));
    room.round = -1;
    for (const pl of room.players.values()) {
      pl.score = 0;
      pl.picks = [];
    }
    return nextRound(room);
  }
  const { rounds, cats, level, yearLevel } = room.settings;
  // an even share of each chosen kind, then shuffled into a random order
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  let kinds = [];
  while (kinds.length < rounds) kinds.push(...shuffle([...cats]));
  kinds = shuffle(kinds.slice(0, rounds));
  const count = (k) => kinds.filter((x) => x === k).length;
  const prompts = E.drawPrompts(Math.random, count("places"));
  const people = People.draw(Math.random, count("people"), new Set(), level);
  const events = W.draw(Math.random, count("years"), yearLevel || 2);
  room.items = kinds.map((k) => (k === "places" ? { kind: "places", prompt: prompts.shift() } : k === "people" ? { kind: "people", person: people.shift() } : { kind: "year", event: events.shift() }));
  room.round = -1;
  for (const pl of room.players.values()) {
    pl.score = 0;
    pl.picks = [];
  }
  nextRound(room);
}

function nextRound(room) {
  clearTimeout(room.timerId);
  room.round++;
  room.picks = new Map();
  room.hints = new Set();
  room.state = room.round >= roundsOf(room) ? "over" : "round";
  room.deadline = 0;
  if (room.state === "round" && room.settings.timer) {
    const ms = room.settings.timer * 1000;
    // Warpath plays a fight and an answer card after each round, so its clock starts after a short break
    const pause = room.game === "warpath" && room.round > 0 ? WAR_PAUSE : 0;
    room.clockAt = Date.now() + pause;
    room.deadline = room.clockAt + ms;
    const r = room.round;
    // a little grace so answers sent at the last moment still arrive
    room.timerId = setTimeout(() => room.state === "round" && room.round === r && endRound(room), pause + ms + 1200);
  }
  broadcast(room);
}

function endRound(room) {
  if (room.state !== "round") return;
  clearTimeout(room.timerId);
  const item = room.items[room.round];
  for (const pl of room.players.values()) {
    const pick = room.picks.get(pl.id);
    let entry;
    if (item.kind === "year") {
      const guess = pick ? pick.year : null;
      entry = { kind: "year", event: item.event.id, guess, y: item.event.y, ...W.judge(item.event, guess) };
    } else if (item.kind === "places") {
      const res = pick ? E.judge(item.prompt, pick.country) : { correct: false, tier: null, points: 0 };
      entry = { kind: "places", prompt: item.prompt.id, country: pick ? pick.country : null, lonlat: pick ? pick.lonlat : null, ...res };
    } else {
      const hint = room.hints.has(pl.id);
      const guess = pick ? pick.guess : null;
      const res = guess ? People.judge(item.person, guess, hint) : { correct: false, tier: People.tierOf(item.person), points: 0 };
      entry = { kind: "people", person: item.person.id, guess, hint, ...res };
    }
    pl.picks[room.round] = entry;
    pl.score += entry.points;
  }
  // Warpath rooms fight one-on-one, so each round's result shows everyone's year and points.
  // Map rooms keep answers private until the end.
  const all =
    room.game === "warpath"
      ? [...room.players.values()].map((pl) => {
          const e = pl.picks[room.round];
          return { id: pl.id, name: pl.name, empire: pl.empire, guess: e.guess, points: e.points, tier: e.tier, off: e.off, score: pl.score };
        })
      : undefined;
  for (const pl of room.players.values()) if (pl.connected) send(pl.ws, { t: "result", round: room.round, rounds: roundsOf(room), ...pl.picks[room.round], all });
  nextRound(room);
}

function allPicked(room) {
  const active = [...room.players.values()].filter((p) => p.connected);
  return active.length > 0 && active.every((p) => room.picks.has(p.id));
}

function leave(room, pl, hard) {
  if (hard) room.players.delete(pl.id);
  else pl.connected = false;
  if (room.host === pl.id || !room.players.has(room.host)) {
    const next = [...room.players.values()].find((p) => p.connected);
    if (next) room.host = next.id;
  }
  if (![...room.players.values()].some((p) => p.connected)) room.emptySince = Date.now();
  if (room.state === "round" && allPicked(room)) endRound(room);
  broadcast(room);
}

// Remove rooms nobody has been in for 15 minutes (the host calls this every minute).
function sweep() {
  for (const [code, room] of rooms)
    if (room.emptySince && Date.now() - room.emptySince > 15 * 60_000) {
      rooms.delete(code);
    }
}

// ---------------------------------------------------------------------
// WebSocket protocol
// ---------------------------------------------------------------------
function connect(ws) {
  let room = null;
  let me = null;
  let budget = 30; // simple flood guard: 30 messages, refilled 3 per second
  let last = Date.now();

  const fail = (msg) => send(ws, { t: "error", msg });

  function message(raw) {
    const now = Date.now();
    budget = Math.min(30, budget + ((now - last) / 1000) * 3);
    last = now;
    raw = String(raw);
    if (raw.length > 4096) return;
    if (--budget < 0) return;
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (!m || typeof m.t !== "string") return;

    switch (m.t) {
      case "create":
      case "join": {
        if (me) return fail("You're already in a room.");
        const game = m.game === "warpath" ? "warpath" : "longshot";
        if (m.t === "create") room = createRoom(m.settings, game);
        else {
          room = rooms.get(String(m.code || "").toUpperCase().trim());
          if (!room) return fail("No room with that code.");
          if (room.game !== game) {
            const r = room;
            room = null;
            return fail(r.game === "warpath" ? "That code is for a Warpath room. Open Warpath to join it." : "That code is for an Avdle map room, not Warpath.");
          }
          if (room.players.size >= MAX_PLAYERS) return fail("That room is full.");
        }
        me = { id: randomId(), token: randomToken(), name: cleanName(m.name), score: 0, ws, connected: true, picks: [] };
        if (room.game === "warpath") {
          const taken = new Set([...room.players.values()].map((p) => p.empire));
          const wanted = W.EMPIRES.includes(m.empire) ? m.empire : null;
          me.empire = wanted && !taken.has(wanted) ? wanted : W.EMPIRES.find((e) => !taken.has(e)) || W.EMPIRES[0];
        }
        room.players.set(me.id, me);
        const hostHere = room.players.get(room.host);
        if (!hostHere || !hostHere.connected) room.host = me.id;
        room.emptySince = null;
        send(ws, { t: "joined", code: room.code, id: me.id, token: me.token });
        return broadcast(room);
      }
      case "rejoin": {
        const r = rooms.get(String(m.code || "").toUpperCase());
        const pl = r && r.players.get(String(m.id || ""));
        if (r && r.game !== (m.game === "warpath" ? "warpath" : "longshot")) return send(ws, { t: "gone" });
        if (!pl || pl.token !== m.token) return send(ws, { t: "gone" });
        if (pl.ws && pl.ws !== ws) pl.ws.close();
        room = r;
        me = pl;
        me.ws = ws;
        me.connected = true;
        room.emptySince = null;
        send(ws, { t: "joined", code: room.code, id: me.id, token: me.token });
        return broadcast(room);
      }
    }

    if (!room || !me) return;
    switch (m.t) {
      case "start":
        if (room.host !== me.id) return fail("Only the host can start.");
        if (room.state === "round") return;
        return startGame(room);
      case "settings":
        if (room.host !== me.id || room.state === "round") return;
        room.settings = room.game === "warpath" ? cleanWarSettings(m.settings, room.settings) : cleanSettings(m.settings, room.settings);
        return broadcast(room);
      case "hint": {
        const item = current(room);
        if (!item || item.kind !== "people" || m.round !== room.round || room.picks.has(me.id)) return;
        room.hints.add(me.id);
        return send(ws, { t: "hint", round: room.round, text: People.hint(item.person) });
      }
      case "guess": {
        if (current(room)?.kind !== "people" || m.round !== room.round) return;
        room.picks.set(me.id, { guess: String(m.text || "").replace(/[ -]/g, "").trim().slice(0, 60) });
        if (allPicked(room)) endRound(room);
        else broadcast(room);
        return;
      }
      case "year": {
        if (current(room)?.kind !== "year" || m.round !== room.round) return;
        const y = Number(m.year);
        room.picks.set(me.id, { year: W.isYear(y) ? y : null });
        if (allPicked(room)) endRound(room);
        else broadcast(room);
        return;
      }
      case "pick": {
        if (current(room)?.kind !== "places" || m.round !== room.round) return;
        if (!E.BY_ID[m.country]) return;
        const ll = Array.isArray(m.lonlat) && m.lonlat.length === 2 && m.lonlat.every((v) => Number.isFinite(v)) ? m.lonlat.map((v) => Math.round(v * 1000) / 1000) : null;
        room.picks.set(me.id, { country: m.country, lonlat: ll });
        if (allPicked(room)) endRound(room);
        else broadcast(room);
        return;
      }
      case "lobby":
        // host goes back to the lobby after a game to change the rules
        if (room.host !== me.id || room.state !== "over") return;
        room.state = "lobby";
        return broadcast(room);
      case "skip":
        // host moves on without players who are away (they get no points this round)
        if (room.host !== me.id || room.state !== "round" || m.round !== room.round) return;
        return endRound(room);
      case "empire":
        // each warrior picks their own empire in the lobby
        if (room.game !== "warpath" || room.state === "round" || !W.EMPIRES.includes(m.empire)) return;
        me.empire = m.empire;
        return broadcast(room);
      case "rename":
        me.name = cleanName(m.name);
        return broadcast(room);
      case "leave":
        leave(room, me, true);
        room = me = null;
        return;
    }
  }

  function close() {
    if (room && me && me.ws === ws) leave(room, me, false);
  }

  return { message, close };
}

const stats = () => ({ rooms: rooms.size, prompts: E.POOL.length, people: People.LIST.length, moments: W.LIST.length });

module.exports = { connect, sweep, stats };
