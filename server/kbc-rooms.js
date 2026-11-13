// Crorepati rooms: a small relay, shared by the Node server and the Cloudflare Worker.
//
// Two kinds of room:
//  - "duo": the creator ("lead") runs the game in their browser and is the only one who can lock in,
//    use lifelines or quit. Their screen is relayed to the partner, who can suggest answers. Both chat.
//  - "party": up to 8 players. The host starts a round; the server picks one seed so every player
//    gets the same 17 questions, and each plays their own game. Players who are out can watch anyone
//    still playing; everyone (players and watchers) shares one chat. When the last player finishes,
//    everyone gets the results board.
"use strict";

const rooms = new Map(); // code -> room
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_STATE = 24000;
const PARTY_MAX = 8;
const randInt = (n) => {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] % n;
};
const token = () => {
  const a = new Uint8Array(16);
  globalThis.crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
};
const newCode = () => {
  for (;;) {
    let c = "";
    for (let i = 0; i < 4; i++) c += CODE_CHARS[randInt(CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
};
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : lo);
function send(ws, m) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(m));
}
const seated = (room) => room.seats.filter(Boolean);
const players = (room) =>
  seated(room).map((s) => ({
    id: s.id, name: s.name, role: s.role, online: !!s.ws,
    // party progress: which question, money won so far, and how it ended
    i: s.i || 0, won: s.won || 0, status: s.status || "lobby",
  }));
function toAll(room, m) {
  for (const s of seated(room)) if (s.ws) send(s.ws, m);
}
const boardMsg = (room) => ({ t: "players", players: players(room), phase: room.phase || null, host: room.hostId || null });

// ---------- party rounds ----------
function finishRound(room) {
  if (room.kind !== "party" || room.phase !== "playing") return;
  const inRound = seated(room).filter((s) => s.inRound);
  if (inRound.some((s) => s.status === "playing")) return;
  room.phase = "results";
  const rows = inRound
    .map((s) => ({ id: s.id, name: s.name, won: s.won || 0, right: s.right || 0, how: s.how || "left", ms: s.ms || 0 }))
    .sort((a, b) => b.won - a.won || b.right - a.right || a.ms - b.ms);
  room.results = { round: room.round, mode: room.mode, rows };
  toAll(room, { t: "results", ...room.results });
  toAll(room, boardMsg(room));
}
function leaveRound(room, seat) {
  if (room.kind === "party" && room.phase === "playing" && seat.inRound && seat.status === "playing") {
    seat.status = "out";
    seat.how = "left";
    seat.ms = Date.now() - room.startedAt;
  }
}

function connect(ws) {
  let room = null, seat = null;
  let budget = 40, last = Date.now();
  const fail = (msg) => send(ws, { t: "error", msg });
  const welcome = () => {
    send(ws, {
      t: "joined", code: room.code, kind: room.kind, id: seat.id, role: seat.role, token: seat.token, name: seat.name,
      players: players(room), chat: room.chat, phase: room.phase || null, host: room.hostId || null,
      round: room.kind === "party" && room.phase === "playing" ? { seed: room.seed, mode: room.mode, round: room.round } : null,
      results: room.kind === "party" && room.phase === "results" ? room.results : null,
    });
    if (room.kind === "duo" && room.state && seat.role === "partner") send(ws, { t: "state", s: room.state });
    toAll(room, boardMsg(room));
  };

  function message(raw) {
    const now = Date.now();
    budget = Math.min(40, budget + ((now - last) / 1000) * 6);
    last = now;
    raw = String(raw);
    if (raw.length > MAX_STATE + 200 || --budget < 0) return;
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (!m || typeof m.t !== "string") return;

    if (m.t === "create") {
      if (seat) return fail("You're already in a room.");
      const kind = m.kind === "party" ? "party" : "duo";
      room = { code: newCode(), kind, seats: kind === "party" ? [] : [null, null], state: null, chat: [], emptySince: 0, nextId: 1, phase: kind === "party" ? "lobby" : null, round: 0 };
      seat = { id: room.nextId++, role: kind === "party" ? "host" : "lead", name: clean(m.name, 20) || "Player 1", token: token(), ws };
      if (kind === "party") {
        room.seats.push(seat);
        room.hostId = seat.id;
      } else room.seats[0] = seat;
      rooms.set(room.code, room);
      return welcome();
    }
    if (m.t === "join" || m.t === "rejoin") {
      if (seat) return fail("You're already in a room.");
      const r = rooms.get(clean(m.code, 4).toUpperCase());
      if (!r) return fail("No room with that code. Check it and try again.");
      if (m.t === "rejoin") {
        const s = seated(r).find((x) => x.token === m.token);
        if (!s) return fail("That seat has gone. Join again with the code.");
        if (s.ws && s.ws !== ws) s.ws.close();
        s.ws = ws;
        room = r;
        seat = s;
      } else if (r.kind === "party") {
        if (seated(r).length >= PARTY_MAX) return fail(`This room is full (${PARTY_MAX} players).`);
        // joining in the middle of a round: you watch until the next one
        seat = { id: r.nextId++, role: "player", name: clean(m.name, 20) || `Player ${r.nextId - 1}`, token: token(), ws, status: r.phase === "playing" ? "watching" : "lobby" };
        r.seats.push(seat);
        room = r;
      } else {
        const p = r.seats[1];
        if (p && p.ws) return fail("This room already has two players.");
        seat = { id: r.nextId++, role: "partner", name: clean(m.name, 20) || "Player 2", token: token(), ws };
        r.seats[1] = seat;
        room = r;
      }
      room.emptySince = 0;
      return welcome();
    }
    if (!room || !seat) return;
    switch (m.t) {
      // ---- duo ----
      case "state": // the lead's screen, relayed to the partner
        if (room.kind !== "duo" || seat.role !== "lead" || !m.s || typeof m.s !== "object") return;
        if (JSON.stringify(m.s).length > MAX_STATE) return;
        room.state = m.s;
        if (room.seats[1] && room.seats[1].ws) send(room.seats[1].ws, { t: "state", s: m.s });
        return;
      case "suggest": {
        if (room.kind !== "duo" || seat.role !== "partner") return;
        const j = Number.isInteger(m.j) && m.j >= -1 && m.j <= 3 ? m.j : -1;
        if (room.seats[0] && room.seats[0].ws) send(room.seats[0].ws, { t: "suggest", j, by: seat.name });
        return;
      }

      // ---- party ----
      case "start": {
        if (room.kind !== "party" || seat.id !== room.hostId || room.phase === "playing") return;
        const ready = seated(room).filter((s) => s.ws);
        if (ready.length < 2) return fail("You need at least two players to start.");
        room.phase = "playing";
        room.round++;
        room.mode = m.mode === "tough" ? "tough" : "normal";
        room.seed = token();
        room.startedAt = Date.now();
        room.results = null;
        for (const s of seated(room)) {
          s.inRound = !!s.ws;
          Object.assign(s, { status: s.ws ? "playing" : "watching", i: 0, won: 0, right: 0, how: null, ms: 0, state: null, watch: null });
        }
        toAll(room, { t: "start", seed: room.seed, mode: room.mode, round: room.round });
        return toAll(room, boardMsg(room));
      }
      case "pstate": {
        // a player's own screen: kept for anyone who starts watching, and sent to current watchers
        if (room.kind !== "party" || room.phase !== "playing" || !seat.inRound || !m.s || typeof m.s !== "object") return;
        const txt = JSON.stringify(m.s);
        if (txt.length > MAX_STATE) return;
        seat.state = m.s;
        const i = num(m.s.i, 0, 16), won = num(m.s.won, 0, 7e7);
        const moved = i !== seat.i || won !== seat.won;
        if (seat.status === "playing") Object.assign(seat, { i, won });
        for (const s of seated(room)) if (s.ws && s.watch === seat.id) send(s.ws, { t: "pstate", from: seat.id, s: m.s });
        if (moved) toAll(room, boardMsg(room));
        return;
      }
      case "done": {
        if (room.kind !== "party" || room.phase !== "playing" || !seat.inRound || seat.status !== "playing") return;
        const how = ["wrong", "timeup", "quit", "top"].includes(m.how) ? m.how : "wrong";
        Object.assign(seat, { status: how === "top" ? "top" : "out", how, won: num(m.won, 0, 7e7), right: num(m.right, 0, 17), ms: Date.now() - room.startedAt });
        toAll(room, boardMsg(room));
        return finishRound(room);
      }
      case "watch": {
        if (room.kind !== "party") return;
        const target = seated(room).find((s) => s.id === m.id && s !== seat);
        seat.watch = target ? target.id : null;
        if (target && target.state) send(ws, { t: "pstate", from: target.id, s: target.state });
        return;
      }
      case "lobby": // the host takes everyone back to the room screen after the results
        if (room.kind !== "party" || seat.id !== room.hostId || room.phase === "playing") return;
        room.phase = "lobby";
        for (const s of seated(room)) Object.assign(s, { status: "lobby", inRound: false, watch: null });
        toAll(room, { t: "lobby" });
        return toAll(room, boardMsg(room));

      // ---- both ----
      case "chat": {
        const text = clean(m.text, 240);
        if (!text) return;
        const msg = { by: seat.name, id: seat.id, role: seat.role, text, at: Date.now() };
        room.chat.push(msg);
        if (room.chat.length > 80) room.chat.shift();
        return toAll(room, { t: "chat", ...msg });
      }
      case "leave":
        if (room.kind === "party") {
          leaveRound(room, seat);
          room.seats = room.seats.filter((s) => s !== seat);
          if (room.hostId === seat.id) {
            const next = seated(room).find((s) => s.ws) || seated(room)[0];
            room.hostId = next ? next.id : null;
            if (next) next.role = "host";
          }
          toAll(room, boardMsg(room));
          finishRound(room);
        } else {
          room.seats[room.seats.indexOf(seat)] = null;
          toAll(room, boardMsg(room));
          if (seat.role === "lead") toAll(room, { t: "closed" });
        }
        seat = null;
        if (!seated(room).some((s) => s.ws)) room.emptySince = Date.now();
        room = null;
        return;
    }
  }
  function close() {
    if (!room || !seat || seat.ws !== ws) return;
    seat.ws = null;
    toAll(room, boardMsg(room));
    if (!seated(room).some((s) => s.ws)) room.emptySince = Date.now();
  }
  return { message, close };
}

function sweep() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.emptySince && now - room.emptySince > 20 * 60_000) {
      rooms.delete(code);
      continue;
    }
    // a party player who has been disconnected for 3 minutes mid-round counts as having left it,
    // so the round can still finish for everyone else
    if (room.kind === "party" && room.phase === "playing") {
      for (const s of seated(room)) {
        if (s.ws) s.awaySince = 0;
        else if (s.status === "playing") {
          s.awaySince = s.awaySince || now;
          if (now - s.awaySince > 3 * 60_000) leaveRound(room, s);
        }
      }
      finishRound(room);
    }
  }
}

module.exports = { connect, sweep, stats: () => ({ rooms: rooms.size }) };
