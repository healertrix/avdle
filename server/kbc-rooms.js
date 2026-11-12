// Crorepati two-player rooms: a small relay, shared by the Node server and the Cloudflare Worker.
// The player who creates the room ("lead") runs the game in their browser and is the only one who
// can lock in, use lifelines or quit. Their screen state is relayed to the partner, who can suggest
// an answer, and both can chat.
"use strict";

const rooms = new Map(); // code -> room
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_STATE = 24000;
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
function send(ws, m) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(m));
}
const players = (room) => room.seats.filter(Boolean).map((s) => ({ name: s.name, role: s.role, online: !!s.ws }));
function toAll(room, m) {
  for (const s of room.seats) if (s && s.ws) send(s.ws, m);
}

function connect(ws) {
  let room = null, seat = null;
  let budget = 40, last = Date.now();
  const fail = (msg) => send(ws, { t: "error", msg });
  const welcome = () => {
    send(ws, { t: "joined", code: room.code, role: seat.role, token: seat.token, name: seat.name, players: players(room), chat: room.chat });
    if (room.state && seat.role === "partner") send(ws, { t: "state", s: room.state });
    toAll(room, { t: "players", players: players(room) });
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
      room = { code: newCode(), seats: [null, null], state: null, chat: [], emptySince: 0 };
      seat = { role: "lead", name: clean(m.name, 20) || "Player 1", token: token(), ws };
      room.seats[0] = seat;
      rooms.set(room.code, room);
      return welcome();
    }
    if (m.t === "join" || m.t === "rejoin") {
      if (seat) return fail("You're already in a room.");
      const r = rooms.get(clean(m.code, 4).toUpperCase());
      if (!r) return fail("No room with that code. Check it and try again.");
      if (m.t === "rejoin") {
        const s = r.seats.find((x) => x && x.token === m.token);
        if (!s) return fail("That seat has gone. Join again with the code.");
        if (s.ws && s.ws !== ws) s.ws.close();
        s.ws = ws;
        room = r;
        seat = s;
      } else {
        const p = r.seats[1];
        if (p && p.ws) return fail("This room already has two players.");
        seat = { role: "partner", name: clean(m.name, 20) || "Player 2", token: token(), ws };
        r.seats[1] = seat;
        room = r;
      }
      room.emptySince = 0;
      return welcome();
    }
    if (!room || !seat) return;
    switch (m.t) {
      case "state": // the lead's screen, relayed to the partner
        if (seat.role !== "lead" || !m.s || typeof m.s !== "object") return;
        if (JSON.stringify(m.s).length > MAX_STATE) return;
        room.state = m.s;
        if (room.seats[1] && room.seats[1].ws) send(room.seats[1].ws, { t: "state", s: m.s });
        return;
      case "suggest": {
        if (seat.role !== "partner") return;
        const j = Number.isInteger(m.j) && m.j >= -1 && m.j <= 3 ? m.j : -1;
        if (room.seats[0] && room.seats[0].ws) send(room.seats[0].ws, { t: "suggest", j, by: seat.name });
        return;
      }
      case "chat": {
        const text = clean(m.text, 240);
        if (!text) return;
        const msg = { by: seat.name, role: seat.role, text, at: Date.now() };
        room.chat.push(msg);
        if (room.chat.length > 60) room.chat.shift();
        return toAll(room, { t: "chat", ...msg });
      }
      case "leave":
        room.seats[room.seats.indexOf(seat)] = null;
        toAll(room, { t: "players", players: players(room) });
        if (seat.role === "lead") toAll(room, { t: "closed" });
        seat = null;
        if (!room.seats.some((s) => s && s.ws)) room.emptySince = Date.now();
        room = null;
        return;
    }
  }
  function close() {
    if (!room || !seat || seat.ws !== ws) return;
    seat.ws = null;
    toAll(room, { t: "players", players: players(room) });
    if (!room.seats.some((s) => s && s.ws)) room.emptySince = Date.now();
  }
  return { message, close };
}

function sweep() {
  for (const [code, room] of rooms) if (room.emptySince && Date.now() - room.emptySince > 20 * 60_000) rooms.delete(code);
}

module.exports = { connect, sweep, stats: () => ({ rooms: rooms.size }) };
