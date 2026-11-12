// Crorepati: a KBC-style quiz on its own full-screen stage. Silent: no sound, no speech.
// 17 questions from ₹1,000 to ₹7 Crore, padavs (safe levels) at ₹10,000 and ₹3,20,000, four lifelines,
// a 45 s / 60 s clock on the early questions, Fastest Finger First (solo), Normal or Tough questions,
// and a two-player mode: the creator locks in, the partner suggests answers, and both can chat.
//
// The whole visible stage is one state object, V. In solo play and for the player who creates a
// two-player room, the game here changes V and calls commit(); for the partner, V arrives from the
// relay (server/kbc-rooms.js) and is only rendered. The answer stays out of V until it is revealed.
(() => {
  "use strict";
  const D = window.KBC_DATA, FX = window.KBCFX;
  const root = document.getElementById("kbc");
  if (!D || !root) return;

  const LADDER = [1000, 2000, 3000, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1250000, 2500000, 5000000, 7500000, 10000000, 70000000];
  const N = LADDER.length;
  const PADAV = new Set([4, 9]);
  // which tier of the question bank each question draws from
  const TIERS = {
    normal: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5],
    tough: [2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5],
  };
  const LETTERS = ["A", "B", "C", "D"];
  const timeOf = (i) => (i < 5 ? 45 : i < 10 ? 60 : 0);
  const safeBelow = (i) => (i > 9 ? LADDER[9] : i > 4 ? LADDER[4] : 0);
  const LIFE = [
    ["fifty", "50:50", "50:50"],
    ["poll", "poll", "Audience poll"],
    ["expert", "expert", "Ask the expert"],
    ["flip", "flip", "Flip the question"],
  ];

  // ---------- helpers ----------
  const $ = (s, e = root) => e.querySelector(s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("kbc." + k);
        return v == null ? d : JSON.parse(v);
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("kbc." + k, JSON.stringify(v));
      } catch {}
    },
  };
  const money = (n) => (n >= 1e7 ? `₹${n / 1e7} Crore` : "₹" + n.toLocaleString("en-IN"));
  function amountInWords(n) {
    if (!n) return "Zero rupees only";
    const p = [];
    const cr = Math.floor(n / 1e7), l = Math.floor((n % 1e7) / 1e5), k = Math.floor((n % 1e5) / 1000);
    if (cr) p.push(`${cr} crore`);
    if (l) p.push(`${l} lakh`);
    if (k) p.push(`${k} thousand`);
    return `Rupees ${p.join(" ")} only`;
  }
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : ""));

  // ---------- the host's lines: several of each, never the same one twice in a row ----------
  const LINES = {
    welcome: [
      "Welcome to the hot seat, {name}. Seventeen questions stand between you and ₹7 Crore.",
      "{name}, the hot seat is yours tonight. Let's see how far you can go.",
      "Good evening, {name}. Seventeen questions, two padavs, four lifelines. Shall we begin?",
      "{name}, take a deep breath. The game starts now.",
    ],
    welcomeDuo: [
      "{name} and {partner}, welcome. Two minds, one hot seat. {name} will lock the answers.",
      "Tonight we have a pair in the hot seat: {name} and {partner}. Talk freely, but only {name} locks.",
    ],
    q: ["Question {n}, for {amt}.", "Here is question {n}, worth {amt}.", "Question {n}. {amt} on the line.", "On your screen, question {n}, for {amt}."],
    q15: ["Question 15, for ₹75 Lakh. The big money starts here.", "For ₹75 Lakh, question 15."],
    q16: ["Question 16. This one is for ₹1 Crore.", "For one crore rupees, here is question 16.", "The ₹1 Crore question. Take your time."],
    q17: ["The final question. For ₹7 Crore.", "Question 17. Seven crore rupees. Only the very best get here."],
    noClock: ["From here on there's no clock. Take all the time you need.", "The clock stops now. Think as long as you like."],
    lockAsk: ["{L}. Shall I lock it?", "Is {L} your final answer?", "{L}? Lock it?", "You're going with {L}?"],
    locked: ["Locked: {L}.", "{L} is locked.", "Your answer is locked: {L}."],
    right: ["That is the right answer! You've won {amt}.", "Absolutely right. {amt} is yours.", "Correct! {amt} won.", "Right answer. You now have {amt}."],
    padav: ["Padav! {amt} is safe now, whatever happens next.", "You've reached the padav. Nobody can take {amt} away from you now.", "First padav crossed! {amt} is guaranteed."],
    padav2: ["Second padav! {amt} is locked in for you.", "Padav reached: {amt} is yours, guaranteed."],
    wrong: ["I'm sorry, that's not the right answer. The answer was {L}: {opt}.", "That's the wrong answer. It was {L}: {opt}.", "Oh, so close. The right answer was {L}: {opt}."],
    timeup: ["Time's up. The answer was {L}: {opt}.", "The clock has run out. It was {L}: {opt}."],
    quit: ["A wise decision. You walk away with {amt}. The answer was {L}: {opt}.", "You've chosen to leave with {amt}. For the record, it was {L}: {opt}."],
    end: ["{name}, you're taking home {amt}. Well played!", "{amt}! Congratulations, {name}.", "What a game. {name} wins {amt}."],
    endZero: ["{name}, it wasn't your day. Come back and try again.", "No winnings this time, {name}. The hot seat will be waiting."],
    crore: ["One crore! {name}, you're a crorepati!", "₹1 Crore! {name}, history made tonight!"],
    jackpot: ["Seven crore! {name}, you've won it all!", "₹7 Crore! The biggest prize of them all goes to {name}!"],
    fffIntro: ["Fastest Finger First. Ten contestants, one question. The fastest correct answer takes the hot seat.", "Here's your Fastest Finger First question. Be quick, be right."],
    fffWin: ["Fastest of them all! {name}, come to the hot seat.", "{name}, you were quickest. The hot seat is yours."],
    fffClose: ["Nobody got it fully right, but {name} came closest. Come to the hot seat!", "Not perfect, but closest of all. {name}, the hot seat is yours."],
    fffLose: ["{rival} was faster this time. Let's go again.", "Close, but {rival} got there first. One more round?"],
    fifty: ["Two wrong answers, gone.", "Fifty-fifty. Now it's down to two."],
    poll: ["Let's hear from the audience.", "Audience, please vote now."],
    expert: ["Let's bring in our expert.", "Our expert is on the line."],
    flip: ["A new question, for the same money.", "Flipping the question."],
  };
  const lastLine = {};
  function line(key, v = {}) {
    const pool = LINES[key];
    let k = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && k === lastLine[key]) k = (k + 1) % pool.length;
    lastLine[key] = k;
    return fill(pool[k], v);
  }

  // "Take your time" nudges: picked from what's true right now, and never repeated soon
  const NUDGES = [
    (c) => c.lifeLeft.length > 1 && `You still have ${c.lifeLeft.slice(0, -1).join(", ")} and ${c.lifeLeft.slice(-1)}. This might be the moment.`,
    (c) => c.lifeLeft.includes("50:50") && "A 50:50 would leave just two options to choose between.",
    (c) => c.lifeLeft.includes("Audience poll") && "The audience is right here. They might know this one.",
    (c) => c.lifeLeft.includes("Ask the expert") && "Our expert is on standby, if you'd like a second opinion.",
    (c) => c.lifeLeft.includes("Flip the question") && "Don't like this question? You can flip it for another one.",
    (c) => !c.lifeLeft.length && "No lifelines left. It's you and your knowledge now.",
    (c) => c.left > 12 && `${c.left} seconds left. What does your first instinct say?`,
    (c) => c.left && c.left <= 12 && `${c.left} seconds! Lock something in, or use a lifeline.`,
    (c) => `Get this right and you'll have ${c.next}.`,
    (c) => c.won > 0 && `Right now you have ${money(c.won)}. If you're unsure, quitting keeps it safe.`,
    (c) => c.toPadav > 0 && c.toPadav < 3 && `You're ${c.toPadav === 1 ? "one answer" : "two answers"} away from the next padav.`,
    (c) => c.safe > 0 && `Remember, ${money(c.safe)} is already safe. That's yours whatever happens.`,
    () => "Read the question once more. The clue is often in the wording.",
    () => "Which option can you rule out first?",
    () => "Take a breath. Cross off what you know is wrong.",
    () => "Sometimes the obvious answer is right. Sometimes it's a trap.",
    () => "Many contestants have sat exactly here. Think it through.",
    () => "Go with what you know, not with what you fear.",
    () => "Picture where you've read about this. Does anything come back?",
    (c) => c.partner && `What does ${c.partner} think? Talk it over.`,
    (c) => c.partner && `${c.partner}, help out here. Any idea?`,
    (c) => c.sel >= 0 && `You keep coming back to ${LETTERS[c.sel]}. Ready to lock it?`,
    (c) => c.i >= 10 && "There's no clock, but don't let doubt creep in.",
    (c) => c.i >= 14 && `This is serious money: ${c.amt}. No hurry.`,
  ];
  let nudgeRecent = store.get("nudges", []);
  function nudgeText() {
    const c = nudgeCtx();
    let options = NUDGES.map((f, k) => [k, f(c)]).filter(([k, s]) => s && !nudgeRecent.includes(k));
    if (!options.length) {
      nudgeRecent = [];
      options = NUDGES.map((f, k) => [k, f(c)]).filter(([, s]) => s);
    }
    const [k, s] = pick(options);
    nudgeRecent.push(k);
    if (nudgeRecent.length > 10) nudgeRecent.shift();
    store.set("nudges", nudgeRecent);
    return s;
  }

  // Ask the expert: who answers, and how they reason
  const EXPERTS = [
    ["Dr. Kavita Rao", "historian"], ["Prof. Suresh Menon", "physics professor"], ["Ananya", "your quiz-club friend"],
    ["Col. R.S. Bedi (retd.)", "military-history buff"], ["Farah Siddiqui", "film journalist"], ["Vikram Iyer", "sports commentator"],
    ["Dr. Neha Joshi", "doctor"], ["Rohan", "your cousin who reads everything"], ["Meenakshi Sundaram", "retired schoolteacher"],
    ["Arjun Mehta", "tech journalist"], ["Pandit Hariharan", "Sanskrit scholar"], ["Zoya Khan", "geography teacher"],
  ];
  const X_OPEN = ["Okay, let me think out loud.", "Oh, I know a little about this.", "Hmm, give me a second.", "Interesting one!", "Right, here's what I've got.", "I had a feeling you'd call about something like this."];
  const X_CLUE = ["I remember reading that {c}", "What I'm fairly sure of is this: {c}", "There's a fact I came across once: {c}", "If I recall correctly, {c}", "Something I read years ago: {c}"];
  const X_SURE = ["So I'm going with {L}, {opt}. About {p}% sure.", "That points me to {L}: {opt}. I'd say {p}%.", "My answer is {L}, {opt}. {p}% confident.", "Put me down for {L}: {opt}. {p}% sure."];
  const X_UNSURE = [
    "Honestly, I'm torn. Something tells me {L}, {opt}, but I'm only about {p}% sure. Don't go on my word alone.",
    "It rings a bell, but faintly. I'd lean to {L}: {opt}. Maybe {p}%.",
    "I'm not certain at all. If I had to pick, {L}, {opt}. Call it {p}%.",
  ];
  // a sentence from the solution that hints at the answer without naming it
  function clueFrom(q) {
    const ans = q.opts[q.ans].toLowerCase();
    const keys = ans.split(/[^a-z0-9À-ɏ]+/).filter((w) => w.length >= 4);
    const sentences = q.why.split(/(?<=[.!?])\s+/).filter((s) => {
      const low = s.toLowerCase();
      return s.length > 25 && !low.includes(ans) && !keys.some((k) => low.includes(k)) && !/^(don't|that is|that's)/i.test(s);
    });
    if (!sentences.length) return null;
    const s = pick(sentences).replace(/[.!]$/, "");
    return s.charAt(0).toLowerCase() + s.slice(1) + ".";
  }

  // =====================================================================
  // The stage
  // =====================================================================
  const ICON = {
    poll: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M10 20V5M15 20v-7M20 20V8"/></svg>',
    expert: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="8" r="3.5"/><path d="M4 20c1-4 3.8-6 7-6s6 2 7 6"/><path d="M19 3.5l1 2 2.2.4-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.4z" fill="currentColor" stroke="none"/></svg>',
    flip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h13l-3-3M20 15H7l3 3"/></svg>',
  };
  root.innerHTML = `
    <div class="kbc-set" aria-hidden="true"><i class="kbc-rays"></i><i class="kbc-floor"></i></div>
    <header class="kbc-top">
      <span class="kbc-brand"><i>₹</i>CROREPATI</span>
      <span class="kbc-tag" id="kbcTag"></span>
      <span class="kbc-won" id="kbcWon"></span>
      <button class="kbc-x kbc-chat-btn" id="kbcChatBtn" type="button" hidden>Chat</button>
      <button class="kbc-x kbc-ladder-btn" id="kbcLadderBtn" type="button" aria-label="Show the money ladder">Ladder</button>
      <button class="kbc-x" id="kbcHelpBtn" type="button" title="How to play" aria-label="How to play">?</button>
      <button class="kbc-x" id="kbcExit" type="button" title="Back to Avdle">✕ <span>Exit</span></button>
    </header>
    <div class="kbc-body">
      <main class="kbc-stage">
        <div class="kbc-hostrow">
          <div class="kbc-hostwrap"><div class="kbc-host" id="kbcHost" aria-hidden="true"><canvas id="kbcHostCv"></canvas></div><span class="kbc-outfit" id="kbcOutfit"></span></div>
          <div class="kbc-bubble" id="kbcBubble" aria-live="polite"><p id="kbcSay"></p><button class="kbc-skip" id="kbcSkip" type="button" hidden aria-label="Skip">›</button></div>
        </div>
        <div class="kbc-play" id="kbcPlay" hidden>
          <div class="kbc-tools">
            <div class="kbc-lifelines" id="kbcLife"></div>
            <div class="kbc-timer" id="kbcTimer" hidden>
              <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="kbc-tr-bg" cx="22" cy="22" r="19"/><circle class="kbc-tr" id="kbcTr" cx="22" cy="22" r="19"/></svg>
              <b id="kbcTn"></b>
            </div>
          </div>
          <div class="kbc-q"><span class="kbc-qnum" id="kbcQnum"></span><p id="kbcQ"></p></div>
          <div class="kbc-opts" id="kbcOpts"></div>
          <div class="kbc-acts" id="kbcActs"></div>
        </div>
        <div class="kbc-banner" id="kbcBanner" hidden></div>
      </main>
      <aside class="kbc-side">
        <div class="kbc-ladder" id="kbcLadder" aria-label="Money ladder"><ol id="kbcRungs"></ol></div>
        <section class="kbc-chat" id="kbcChat" hidden aria-label="Chat">
          <header class="kbc-chat-head"><b id="kbcChatTitle">Chat</b><span id="kbcChatWho"></span></header>
          <ol class="kbc-chat-log" id="kbcChatLog" aria-live="polite"></ol>
          <div class="kbc-chips" id="kbcChips"></div>
          <form class="kbc-chat-form" id="kbcChatForm" autocomplete="off"><input id="kbcChatIn" maxlength="240" placeholder="Say something…" aria-label="Chat message"><button class="kbc-btn small gold" type="submit">Send</button></form>
        </section>
      </aside>
    </div>
    <div class="kbc-layer" id="kbcLayer"></div>
    <div class="kbc-layer kbc-local" id="kbcLocal"></div>
    <canvas class="kbc-fx" id="kbcFw" hidden aria-hidden="true"></canvas>
    <canvas class="kbc-fx kbc-celebrate" id="kbcCel" hidden aria-label="Celebration. Tap to continue."></canvas>`;

  const host = $("#kbcHost");
  const layer = $("#kbcLayer");
  const local = $("#kbcLocal");
  const playEl = $("#kbcPlay");
  const optsEl = $("#kbcOpts");
  const actsEl = $("#kbcActs");
  const lifeEl = $("#kbcLife");
  const hostLED = FX ? FX.Host($("#kbcHostCv"), $("#kbcOutfit")) : null;
  const fireworks = FX ? FX.Fireworks($("#kbcFw")) : null;
  const celebration = FX ? FX.Celebration($("#kbcCel")) : null;
  const OUTFITS_N = hostLED ? hostLED.count : 12;

  // =====================================================================
  // Two-player networking
  // =====================================================================
  const NET = { ws: null, role: null, code: null, token: null, players: [], chat: [], leaving: false, onJoined: null, onPlayers: null, onError: null };
  const duo = () => !!NET.code;
  const isLead = () => !duo() || NET.role === "lead";
  const otherName = () => (NET.players.find((p) => p.role !== NET.role) || {}).name || "";
  function netSend(m) {
    if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(m));
  }
  function netConnect(first) {
    NET.leaving = false;
    const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws-kbc");
    NET.ws = ws;
    ws.onopen = () => (NET.code && NET.token ? netSend({ t: "rejoin", code: NET.code, token: NET.token }) : first && first());
    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      onNet(m);
    };
    ws.onerror = () => NET.onError && !NET.code && NET.onError("Couldn't reach the server. Is it running?");
    ws.onclose = () => {
      if (NET.ws !== ws) return;
      NET.ws = null;
      if (!NET.leaving && NET.code && !root.hidden) setTimeout(() => !NET.ws && NET.code && netConnect(), 1500);
    };
  }
  function netLeave() {
    NET.leaving = true;
    netSend({ t: "leave" });
    if (NET.ws) NET.ws.close();
    Object.assign(NET, { ws: null, role: null, code: null, token: null, players: [], chat: [] });
    syncChat();
  }
  function onNet(m) {
    if (m.t === "error") return NET.onError && NET.onError(m.msg);
    if (m.t === "joined") {
      const fresh = !NET.code;
      Object.assign(NET, { role: m.role, code: m.code, token: m.token, players: m.players });
      if (fresh) {
        NET.chat = m.chat || [];
        chatLog.replaceChildren();
      }
      syncChat();
      if (NET.onJoined) NET.onJoined();
      if (NET.role === "lead" && V.scr !== "intro") commit();
      return;
    }
    if (m.t === "players") {
      const before = otherName();
      NET.players = m.players;
      syncChat();
      if (NET.onPlayers) NET.onPlayers();
      const other = NET.players.find((p) => p.role !== NET.role);
      if (other && !before) sysChat(`${other.name} joined.`);
      if (NET.role === "lead" && V.scr === "play") {
        V.names.partner = other ? other.name : V.names.partner;
        commit();
      }
      return;
    }
    if (m.t === "state" && NET.role === "partner") {
      V = m.s;
      if (V.scr === "play" || V.scr === "end") local.replaceChildren();
      render();
      return;
    }
    if (m.t === "suggest" && NET.role === "lead") {
      if (V.phase !== "answer") return;
      V.suggest = m.j;
      if (m.j >= 0) sysChat(`${m.by} thinks it's ${LETTERS[m.j]}.`);
      commit();
      return;
    }
    if (m.t === "chat") {
      NET.chat.push(m);
      if (NET.chat.length > 60) NET.chat.shift();
      addChat(m);
      return;
    }
    if (m.t === "closed" && NET.role === "partner") sysChat("The room was closed.");
  }

  // ---------- chat panel ----------
  const chatLog = $("#kbcChatLog");
  function addChat(m) {
    const li = el("li", m.sys ? "sys" : m.role === NET.role ? "me" : "them");
    if (!m.sys) li.append(el("b", null, m.by));
    li.append(el("span", null, m.text));
    chatLog.append(li);
    chatLog.scrollTop = chatLog.scrollHeight;
    if (!m.sys && m.role !== NET.role && !root.classList.contains("chat-open")) $("#kbcChatBtn").classList.add("ping");
  }
  function sysChat(text) {
    addChat({ sys: true, text });
  }
  function syncChat() {
    const on = duo();
    $("#kbcChat").hidden = !on;
    $("#kbcChatBtn").hidden = !on;
    root.classList.toggle("is-duo", on);
    if (!on) {
      chatLog.replaceChildren();
      return;
    }
    const other = NET.players.find((p) => p.role !== NET.role);
    $("#kbcChatTitle").textContent = other ? `Chat with ${other.name}` : "Chat";
    const who = $("#kbcChatWho");
    who.textContent = other ? (other.online ? "● online" : "○ away") : "waiting for a partner";
    who.className = other && other.online ? "on" : "";
    if (!chatLog.childNodes.length) NET.chat.forEach(addChat);
    const chips = $("#kbcChips");
    chips.replaceChildren();
    const mk = (label, text, j) => {
      const b = el("button", "kbc-chip-btn", label);
      b.type = "button";
      b.addEventListener("click", () => {
        netSend({ t: "chat", text });
        if (j != null && NET.role === "partner") netSend({ t: "suggest", j });
      });
      chips.append(b);
    };
    LETTERS.forEach((L, j) => mk(L, `I think it's ${L}.`, j));
    mk("Not sure", "I'm not sure about this one.");
    mk("Lifeline?", "Should we use a lifeline?");
    mk("Quit?", "Maybe we should quit here.");
    mk("Go for it", "Go for it! Lock it.");
  }
  $("#kbcChatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("#kbcChatIn");
    const text = inp.value.trim();
    if (!text) return;
    netSend({ t: "chat", text });
    inp.value = "";
  });
  $("#kbcChatBtn").addEventListener("click", () => {
    root.classList.toggle("chat-open");
    $("#kbcChatBtn").classList.remove("ping");
  });

  // =====================================================================
  // State
  // =====================================================================
  function blankV() {
    return {
      scr: "intro", say: "", talk: false, mood: null, pose: null, tense: false, outfit: store.get("outfit", 0),
      mode: "normal", duo: false, names: { lead: "", partner: "" },
      i: 0, won: 0, q: null, shown: 0, removed: [], poll: null, sel: -1, phase: "idle", ans: -1,
      timer: null, life: { fifty: true, poll: true, expert: true, flip: true }, modal: null, banner: null, suggest: -1, fx: null,
    };
  }
  let V = blankV();
  let G = null; // the lead's private game: questions with their answers
  let T = 0; // bumps on every new step, so stale async steps stop
  const alive = (t) => t === T && !root.hidden;
  let seq = 0;
  let playerName = store.get("name", "");
  let mode = store.get("mode", "normal");

  function commit() {
    render();
    if (duo() && NET.role === "lead") netSend({ t: "state", s: V });
  }

  // the host speaks in captions; his mouth moves while the line shows
  let sayDone = null;
  function say(text, o = {}) {
    if (sayDone) sayDone();
    V.say = text;
    V.talk = true;
    commit();
    const ms = o.ms != null ? o.ms : Math.min(3600, 900 + text.length * 30);
    return new Promise((res) => {
      const fin = () => {
        clearTimeout(tm);
        if (sayDone === fin) sayDone = null;
        if (V.say === text) {
          V.talk = false;
          commit();
        }
        res();
      };
      const tm = setTimeout(fin, ms);
      sayDone = fin;
    });
  }
  $("#kbcSkip").addEventListener("click", () => sayDone && sayDone());
  const setHost = (mood, pose) => {
    V.mood = mood || null;
    V.pose = pose || null;
  };

  // ---------- drawing questions ----------
  function draw(t, used) {
    const seen = new Set(store.get("seen", []));
    const pool = D.tiers[t].map((_, k) => `${t}:${k}`).filter((id) => !used.has(id));
    let fresh = pool.filter((id) => !seen.has(id));
    if (!fresh.length) {
      store.set("seen", [...seen].filter((id) => !id.startsWith(t + ":")));
      fresh = pool;
    }
    const id = pick(fresh);
    used.add(id);
    const [q, opts, ans, why] = D.tiers[t][+id.split(":")[1]];
    const order = shuffle([0, 1, 2, 3]);
    return { id, q, opts: order.map((j) => opts[j]), ans: order.indexOf(ans), why, tier: t };
  }
  function markSeen(id) {
    const seen = store.get("seen", []);
    if (!seen.includes(id)) {
      seen.push(id);
      if (seen.length > 2000) seen.shift();
      store.set("seen", seen);
    }
  }
  const Q = () => G.qs[V.i];

  // =====================================================================
  // Render: everything visible comes from V
  // =====================================================================
  let lastQid = null, lastModal = null, lastBanner = null, lastFx = null, lastOutfit = null, bannerT = 0;
  function render() {
    const controller = isLead();
    const cl = host.classList;
    cl.remove("laugh", "proud", "surprised", "think", "happy", "sad", "p-namaste", "p-clap", "p-cheer", "p-think", "p-open", "talk", "tense");
    if (V.mood) cl.add(V.mood);
    if (V.pose) cl.add("p-" + V.pose);
    if (V.talk) cl.add("talk");
    if (V.tense) cl.add("tense");
    if (hostLED && V.outfit !== lastOutfit) {
      hostLED.dress(V.outfit);
      lastOutfit = V.outfit;
    }
    $("#kbcSay").textContent = V.say;
    $("#kbcBubble").classList.toggle("empty", !V.say);
    $("#kbcSkip").hidden = !(controller && V.talk && sayDone);
    $("#kbcTag").textContent = V.scr === "play" || V.scr === "end" ? `${V.mode === "tough" ? "Tough" : "Normal"}${V.duo ? " · Two players" : ""}` : "";
    renderLadder();

    // the question area
    const playing = V.scr === "play" && V.q;
    playEl.hidden = !playing;
    if (playing) {
      if (V.q.id !== lastQid) {
        lastQid = V.q.id;
        $("#kbcQnum").textContent = `Question ${V.i + 1} of ${N} · ${money(LADDER[V.i])}`;
        $("#kbcQ").textContent = V.q.q;
        playEl.classList.remove("in");
        void playEl.offsetWidth;
        playEl.classList.add("in");
        optsEl.replaceChildren(
          ...V.q.opts.map((txt, j) => {
            const b = el("button", "kbc-opt");
            b.type = "button";
            b.dataset.j = j;
            b.append(el("span", "kbc-l", LETTERS[j] + ":"), el("span", "kbc-t", txt), el("span", "kbc-pct"), el("span", "kbc-sug"));
            b.addEventListener("click", () => tapOption(j));
            return b;
          })
        );
      }
      optsEl.querySelectorAll(".kbc-opt").forEach((b, j) => {
        const gone = V.removed.includes(j);
        b.classList.toggle("shown", j < V.shown);
        b.classList.toggle("gone", gone);
        b.classList.toggle("sel", V.sel === j && V.phase === "answer");
        b.classList.toggle("lock", V.sel === j && V.phase === "locked" && V.ans < 0);
        b.classList.toggle("right", V.ans === j);
        b.classList.toggle("wrong", V.ans >= 0 && V.sel === j && V.ans !== j);
        b.classList.toggle("tense", V.tense && V.sel === j);
        b.disabled = gone || V.phase !== "answer";
        b.querySelector(".kbc-pct").textContent = V.poll && !gone ? V.poll[j] + "%" : "";
        b.querySelector(".kbc-sug").textContent = V.duo && V.suggest === j && V.phase === "answer" ? (NET.role === "partner" ? "your pick" : `${V.names.partner} thinks`) : "";
      });
      lifeEl.replaceChildren(
        ...LIFE.map(([k, icon, label]) => {
          const b = el("button", "kbc-life" + (V.life[k] ? "" : " used"));
          b.type = "button";
          b.title = label;
          b.setAttribute("aria-label", label + (V.life[k] ? "" : " (used)"));
          if (ICON[icon]) b.innerHTML = ICON[icon];
          else b.append(el("span", null, icon));
          b.disabled = !controller || V.phase !== "answer" || !V.life[k];
          b.addEventListener("click", () => useLife(k));
          return b;
        })
      );
      const tm = $("#kbcTimer");
      tm.hidden = !V.timer;
      if (V.timer) {
        const c = 2 * Math.PI * 19;
        const tr = $("#kbcTr");
        tr.style.strokeDasharray = c;
        tr.style.strokeDashoffset = c * (1 - V.timer.left / V.timer.total);
        $("#kbcTn").textContent = V.timer.left;
        tm.classList.toggle("urgent", V.timer.left <= 10);
      }
      actsEl.replaceChildren();
      if (V.phase === "answer") {
        if (controller) {
          const lock = button(V.sel >= 0 ? `Lock ${LETTERS[V.sel]}` : "Pick an answer", "gold", lockIn);
          lock.disabled = V.sel < 0;
          actsEl.append(button(`Quit with ${money(V.won)}`, "ghost", quitGame), lock);
        } else actsEl.append(el("p", "kbc-hint", `Tap an answer to suggest it. ${V.names.lead} locks it in.`));
      }
    }

    // shared modals (poll, expert, solution, end)
    const mid = V.modal ? V.modal.id : null;
    if (mid !== lastModal) {
      lastModal = mid;
      layer.replaceChildren();
      if (V.modal) buildModal(V.modal, controller);
    }
    // padav banner
    const bid = V.banner ? V.banner.id : null;
    if (bid !== lastBanner) {
      lastBanner = bid;
      const bn = $("#kbcBanner");
      clearTimeout(bannerT);
      if (V.banner) {
        bn.replaceChildren(el("small", null, V.banner.title), el("b", null, V.banner.sub));
        bn.hidden = false;
        bn.classList.remove("go");
        void bn.offsetWidth;
        bn.classList.add("go");
        bannerT = setTimeout(() => (bn.hidden = true), 3200);
      } else bn.hidden = true;
    }
    // effects
    const fid = V.fx ? V.fx.id : null;
    if (fid !== lastFx) {
      lastFx = fid;
      if (V.fx) runFx(V.fx);
    }
  }
  function runFx(f) {
    if (f.k === "pataka" && fireworks) fireworks.fire(f.level);
    if (f.k === "celebrate") {
      if (fireworks) fireworks.fire(3);
      if (celebration) celebration.play({ title: f.title, sub: f.sub, outfit: FX.OUTFITS[V.outfit % FX.OUTFITS.length], ms: f.ms });
    }
  }
  function fx(o) {
    V.fx = { id: ++seq, ...o };
  }
  function renderLadder() {
    const rungs = $("#kbcRungs");
    rungs.replaceChildren();
    const live = V.scr === "play" || V.scr === "end";
    for (let i = N - 1; i >= 0; i--) {
      const li = el("li", "kbc-rung");
      if (PADAV.has(i)) li.classList.add("padav");
      if (i >= 14) li.classList.add("big");
      if (live) {
        if (i === V.i && V.scr === "play") li.classList.add("cur");
        if (V.won >= LADDER[i]) li.classList.add("done");
      }
      li.append(el("span", "kbc-rn", String(i + 1)), el("span", "kbc-ra", money(LADDER[i])));
      if (PADAV.has(i)) li.append(el("em", null, "PADAV"));
      rungs.append(li);
    }
    $("#kbcWon").textContent = live ? `Won ${money(V.won)}` : "";
  }

  // ---------- modal helpers ----------
  function box(where, cls) {
    where.replaceChildren();
    const wrap = el("div", "kbc-modal " + (cls || ""));
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    const b = el("div", "kbc-box");
    wrap.append(b);
    where.append(wrap);
    return b;
  }
  function button(label, cls, fn) {
    const b = el("button", "kbc-btn " + (cls || ""), label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }
  function row(...kids) {
    const r = el("div", "kbc-row");
    r.append(...kids);
    return r;
  }
  function ask(title, text, okLabel, cancelLabel) {
    return new Promise((res) => {
      const prev = [...local.childNodes];
      const b = box(local, "kbc-ask");
      b.append(el("h3", "kbc-h", title), el("p", "kbc-p", text));
      const done = (v) => {
        local.replaceChildren(...prev);
        res(v);
      };
      const ok = button(okLabel, "gold", () => done(true));
      b.append(row(button(cancelLabel, "", () => done(false)), ok));
      setTimeout(() => ok.focus(), 40);
    });
  }
  const waitNote = () => el("p", "kbc-p small center", `Waiting for ${V.names.lead}…`);

  function buildModal(m, controller) {
    if (m.k === "poll") {
      const b = box(layer, "kbc-poll");
      b.append(el("p", "kbc-eyebrow", "Audience poll"), el("h3", "kbc-h", "What the audience thinks"));
      const bars = el("div", "kbc-bars");
      m.p.forEach((v, j) => {
        const gone = V.removed.includes(j);
        const col = el("div", "kbc-bar" + (gone ? " gone" : ""));
        const track = el("span", "kbc-bar-track");
        const fillEl = el("i");
        track.append(fillEl);
        col.append(el("b", null, gone ? "" : v + "%"), track, el("span", "kbc-bar-l", LETTERS[j]));
        bars.append(col);
        requestAnimationFrame(() => requestAnimationFrame(() => (fillEl.style.height = (gone ? 0 : v) + "%")));
      });
      b.append(bars, el("p", "kbc-p small", "The audience isn't always right, especially on the big-money questions."));
      if (controller) {
        const ok = button("Back to the question", "gold", closeLife);
        b.append(row(ok));
        setTimeout(() => ok.focus(), 60);
      } else b.append(waitNote());
    } else if (m.k === "expert") {
      const b = box(layer, "kbc-expert");
      b.append(el("p", "kbc-eyebrow", "Ask the expert"));
      const who = el("div", "kbc-expert-who");
      const nm = el("div");
      nm.append(el("b", null, m.who), el("small", null, m.role));
      who.append(el("span", "kbc-expert-av", m.who.replace(/^(Dr\.|Prof\.|Col\.|Pandit)\s+/, "").charAt(0)), nm);
      b.append(who, el("p", "kbc-expert-say", m.text));
      if (controller) {
        const ok = button("Thank you", "gold", closeLife);
        b.append(row(ok));
        setTimeout(() => ok.focus(), 60);
      } else b.append(waitNote());
    } else if (m.k === "sol") solutionCard(m, controller);
    else if (m.k === "end") endCard(m, controller);
  }

  // =====================================================================
  // Intro, settings and the two-player lobby (local screens)
  // =====================================================================
  function newOutfit() {
    let o = Math.floor(Math.random() * OUTFITS_N);
    if (o === V.outfit) o = (o + 1) % OUTFITS_N;
    store.set("outfit", o);
    return o;
  }
  function showIntro() {
    T++;
    G = null;
    stopTimer();
    const keepOutfit = V.outfit;
    V = blankV();
    V.outfit = keepOutfit;
    V.say = "Welcome to Crorepati.";
    lastQid = lastModal = null;
    render();
    const b = box(local, "kbc-intro");
    b.append(el("p", "kbc-eyebrow", "KBC-style quiz"), el("h2", "kbc-title", "Crorepati"), el("p", "kbc-p", "17 questions, from ₹1,000 to ₹7 Crore. Two padavs, four lifelines, and the full answer after every question."));
    const name = el("label", "kbc-field");
    const inp = el("input");
    inp.maxLength = 20;
    inp.placeholder = "Your name";
    inp.value = playerName;
    inp.autocomplete = "nickname";
    name.append(el("span", null, "Your name"), inp);
    b.append(name);
    const seg = (label, opts, cur, onPick) => {
      const wrap = el("div", "kbc-seg-wrap");
      wrap.append(el("span", "kbc-seg-label", label));
      const s = el("div", "kbc-seg");
      s.setAttribute("role", "radiogroup");
      s.setAttribute("aria-label", label);
      const btns = opts.map(([v, t, sub]) => {
        const x = el("button", "kbc-seg-btn");
        x.type = "button";
        x.setAttribute("role", "radio");
        x.setAttribute("aria-checked", v === cur ? "true" : "false");
        x.append(el("b", null, t), el("small", null, sub));
        x.addEventListener("click", () => {
          btns.forEach((y) => y.setAttribute("aria-checked", y === x ? "true" : "false"));
          onPick(v);
        });
        s.append(x);
        return x;
      });
      wrap.append(s);
      return wrap;
    };
    b.append(
      seg("Questions", [["normal", "Normal", "Like the show: easy start, hard finish"], ["tough", "Tough", "Hard from question 1"]], mode, (v) => {
        mode = v;
        store.set("mode", v);
      })
    );
    let players = store.get("players", "solo");
    const fffRow = el("label", "kbc-switch");
    const fffBox = el("input");
    fffBox.type = "checkbox";
    fffBox.checked = store.get("fff", true);
    fffBox.addEventListener("change", () => store.set("fff", fffBox.checked));
    const fw = el("span");
    fw.append(el("b", null, "Fastest Finger First"), el("small", null, "Race nine others to the hot seat first"));
    fffRow.append(fffBox, el("i"), fw);
    b.append(
      seg("Players", [["solo", "Solo", "Just you"], ["duo", "With a partner", "You lock; they help and chat"]], players, (v) => {
        players = v;
        store.set("players", v);
        fffRow.hidden = v === "duo";
      })
    );
    fffRow.hidden = players === "duo";
    b.append(fffRow);
    const getName = () => (playerName = inp.value.trim().slice(0, 20) || "Contestant");
    const go = button("Play  →", "gold big", () => {
      getName();
      store.set("name", playerName);
      if (players === "duo") return showLobby();
      V.outfit = newOutfit(); // one outfit for the whole game, Fastest Finger First included
      local.replaceChildren();
      if (fffBox.checked) startFFF();
      else startGame();
    });
    const join = button("Join a friend's room", "", () => {
      getName();
      store.set("name", playerName);
      showJoin();
    });
    b.append(row(join, go));
    inp.addEventListener("keydown", (e) => e.key === "Enter" && go.click());
    setTimeout(() => (playerName ? go : inp).focus(), 50);
  }
  function needServer(b) {
    if (location.protocol !== "file:") return false;
    b.append(el("p", "kbc-err", "Two-player games need the server. Run npm start and open http://localhost:8787."), row(button("Back", "", showIntro)));
    return true;
  }
  function showLobby() {
    const b = box(local, "kbc-lobby");
    b.append(el("p", "kbc-eyebrow", "Two players"), el("h3", "kbc-h", "Your room"));
    if (needServer(b)) return;
    const info = el("div", "kbc-lobby-info", "Creating a room…");
    const who = el("ul", "kbc-players");
    const err = el("p", "kbc-err");
    const start = button("Start the game  →", "gold big", () => {
      local.replaceChildren();
      V.outfit = newOutfit();
      startGame();
    });
    start.disabled = true;
    b.append(info, who, err, el("p", "kbc-p small", "You'll lock the answers and use the lifelines. Your partner sees everything, can suggest an answer, and you can chat."), row(button("Cancel", "", () => (netLeave(), showIntro())), start));
    const sync = () => {
      if (!NET.code) return;
      info.replaceChildren();
      const link = `${location.origin}${location.pathname}?kbcroom=${NET.code}`;
      const copy = button("Copy invite link", "small", async () => {
        try {
          await navigator.clipboard.writeText(link);
          copy.textContent = "Copied ✓";
        } catch {
          copy.textContent = link;
        }
      });
      info.append(el("span", null, "Room code"), el("b", "kbc-code", NET.code), copy);
      who.replaceChildren(...NET.players.map((p) => el("li", p.online ? "on" : "", `${p.name}${p.role === "lead" ? " (you, locks the answers)" : ""}${p.online ? "" : " · away"}`)));
      const partner = NET.players.find((p) => p.role === "partner" && p.online);
      if (!partner) who.append(el("li", "wait", "Waiting for your partner to join…"));
      start.disabled = !partner;
    };
    NET.onJoined = sync;
    NET.onPlayers = sync;
    NET.onError = (msg) => (err.textContent = msg);
    if (NET.code && NET.role === "lead") sync();
    else {
      if (NET.code) netLeave();
      netConnect(() => netSend({ t: "create", name: playerName }));
    }
  }
  function showJoin(code) {
    const b = box(local, "kbc-lobby");
    b.append(el("p", "kbc-eyebrow", "Two players"), el("h3", "kbc-h", "Join a room"));
    if (needServer(b)) return;
    const name = el("label", "kbc-field");
    const nin = el("input");
    nin.maxLength = 20;
    nin.value = playerName;
    nin.placeholder = "Your name";
    name.append(el("span", null, "Your name"), nin);
    const f = el("label", "kbc-field");
    const cin = el("input");
    cin.maxLength = 4;
    cin.placeholder = "ABCD";
    cin.value = code || "";
    cin.className = "kbc-code-in";
    cin.autocapitalize = "characters";
    f.append(el("span", null, "Room code"), cin);
    const err = el("p", "kbc-err");
    const status = el("p", "kbc-p small");
    const go = button("Join  →", "gold big", () => {
      const c = cin.value.trim().toUpperCase();
      if (c.length !== 4) return (err.textContent = "Enter the 4-letter room code.");
      playerName = nin.value.trim().slice(0, 20) || "Partner";
      store.set("name", playerName);
      err.textContent = "";
      status.textContent = "Joining…";
      NET.onError = (msg) => {
        err.textContent = msg;
        status.textContent = "";
        if (NET.code) netLeave();
      };
      NET.onPlayers = null;
      NET.onJoined = () => {
        status.textContent = "";
        V = blankV();
        V.say = `You're in. Waiting for ${otherName() || "your partner"} to start.`;
        render();
        b.replaceChildren(
          el("p", "kbc-eyebrow", "Two players"),
          el("h3", "kbc-h", `Room ${NET.code}`),
          el("p", "kbc-p", `You're in with ${otherName()}. They start the game and lock the answers; you can suggest answers and chat.`),
          row(button("Leave", "", () => (netLeave(), showIntro())))
        );
      };
      if (NET.code) netLeave();
      netConnect(() => netSend({ t: "join", code: c, name: playerName }));
    });
    b.append(name, f, err, status, row(button("Back", "", showIntro), go));
    cin.addEventListener("input", () => (cin.value = cin.value.toUpperCase().replace(/[^A-Z]/g, "")));
    cin.addEventListener("keydown", (e) => e.key === "Enter" && go.click());
    setTimeout(() => (code ? go : cin).focus(), 50);
  }

  // =====================================================================
  // Fastest Finger First (solo)
  // =====================================================================
  const RIVALS = ["Priya (Pune)", "Rahul (Patna)", "Anjali (Jaipur)", "Imran (Lucknow)", "Deepa (Kochi)", "Gurpreet (Ludhiana)", "Sneha (Bhopal)", "Arjun (Guwahati)", "Kavya (Mysuru)", "Vikram (Nagpur)", "Fatima (Hyderabad)", "Rohan (Indore)", "Meera (Shillong)", "Sandeep (Dehradun)"];
  async function startFFF() {
    const t = ++T;
    G = null;
    V.scr = "fff";
    V.q = null;
    V.modal = null;
    setHost(null, "open");
    await say(line("fffIntro"));
    if (!alive(t)) return;
    let k;
    const last = store.get("fffLast", -1);
    do k = Math.floor(Math.random() * D.fff.length);
    while (D.fff.length > 1 && k === last);
    store.set("fffLast", k);
    const [q, items, order, why] = D.fff[k];
    const b = box(local, "kbc-fff");
    b.append(el("p", "kbc-eyebrow", "Fastest Finger First"), el("h3", "kbc-h", q));
    const clock = el("div", "kbc-fff-clock", "Get ready…");
    const picks = [];
    let done = false, started = false, t0 = 0, tick = 0;
    const tiles = el("div", "kbc-fff-tiles waiting");
    const seqEl = el("div", "kbc-fff-seq");
    const btns = items.map((txt, j) => {
      const x = el("button", "kbc-opt shown kbc-fff-tile");
      x.type = "button";
      x.append(el("span", "kbc-l", LETTERS[j] + ":"), el("span", "kbc-t", txt), el("span", "kbc-badge"));
      x.addEventListener("click", () => tap(j));
      tiles.append(x);
      return x;
    });
    const submit = button("Submit order", "gold", () => finish());
    submit.disabled = true;
    b.append(clock, tiles, seqEl, row(button("Clear", "", () => ((picks.length = 0), sync())), submit));
    function sync() {
      btns.forEach((x, j) => {
        const p = picks.indexOf(j);
        x.classList.toggle("sel", p >= 0);
        x.querySelector(".kbc-badge").textContent = p >= 0 ? p + 1 : "";
      });
      seqEl.replaceChildren(...[0, 1, 2, 3].map((p) => el("span", picks[p] != null ? "on" : "", picks[p] != null ? LETTERS[picks[p]] : "–")));
      submit.disabled = picks.length < 4;
    }
    function tap(j) {
      if (done || !started || !alive(t)) return;
      const p = picks.indexOf(j);
      if (p >= 0) picks.splice(p, 1);
      else if (picks.length < 4) picks.push(j);
      sync();
      if (picks.length === 4) submit.focus();
    }
    sync();
    b.addEventListener("keydown", (e) => {
      const j = "abcd".indexOf(e.key.toLowerCase());
      const n = "1234".indexOf(e.key);
      if (e.key.length === 1 && (j >= 0 || n >= 0)) tap(j >= 0 ? j : n);
    });
    function finish() {
      if (done || !started) return;
      done = true;
      clearInterval(tick);
      if (!alive(t)) return;
      const secs = (performance.now() - t0) / 1000;
      const got = picks.length === 4 ? picks.filter((p, n) => p === order[n]).length : 0;
      // a right order always wins; a quick near miss still wins; only a poor round loses
      const verdict = got === 4 ? "win" : got >= 2 && secs < 25 ? "close" : "lose";
      fffResults({ q, items, order, why, secs, got, verdict });
    }
    await wait(1800);
    if (!alive(t)) return;
    tiles.classList.remove("waiting");
    say("Go!", { ms: 800 });
    t0 = performance.now();
    started = true;
    btns[0].focus();
    tick = setInterval(() => {
      if (!alive(t)) return clearInterval(tick);
      const s = (performance.now() - t0) / 1000;
      clock.textContent = s.toFixed(1) + " s";
      if (s > 60) finish();
    }, 100);
  }
  function fffResults(r) {
    const rows = shuffle(RIVALS.slice()).slice(0, 9).map((n) => ({ n, ok: false, s: rnd(5, 14) }));
    if (r.verdict === "win")
      rows.forEach((x, k) => {
        x.ok = k < 4;
        if (x.ok) x.s = r.secs + rnd(0.3, 4) + k * 0.4;
      });
    else if (r.verdict === "lose")
      rows.forEach((x, k) => {
        x.ok = k < 3;
        if (x.ok) x.s = rnd(3.5, 9) + k * 0.6;
      });
    rows.push({ n: playerName + " (you)", ok: r.got === 4, s: r.secs, me: true });
    rows.sort((a, b) => (a.ok !== b.ok ? (a.ok ? -1 : 1) : a.s - b.s));
    const b = box(local, "kbc-fff");
    b.append(el("p", "kbc-eyebrow", "Fastest Finger First"), el("h3", "kbc-h", r.q));
    const ans = el("ol", "kbc-fff-answer");
    r.order.forEach((j) => ans.append(el("li", null, `${LETTERS[j]}: ${r.items[j]}`)));
    b.append(el("p", "kbc-label", "Right order"), ans, el("p", "kbc-why", r.why));
    const tbl = el("ol", "kbc-fff-board");
    rows.forEach((x, k) => {
      const li = el("li", (x.me ? "me " : "") + (x.ok ? "ok" : "no"));
      li.style.setProperty("--d", `${k * 0.07}s`);
      li.append(el("span", null, x.n), el("b", null, x.ok ? x.s.toFixed(2) + " s" : x.me ? `${r.got}/4 in place` : "wrong"));
      tbl.append(li);
    });
    b.append(tbl);
    if (r.verdict === "lose") {
      setHost("sad", null);
      say(line("fffLose", { rival: rows[0].n.replace(/ \(.*/, "") }));
      b.append(row(button("Skip to the hot seat", "", () => (local.replaceChildren(), startGame())), button("Try another round", "gold", () => (local.replaceChildren(), startFFF()))));
    } else {
      setHost("happy", "open");
      fx({ k: "pataka", level: 1 });
      say(line(r.verdict === "win" ? "fffWin" : "fffClose", { name: playerName }));
      const go = button("Take the hot seat  →", "gold big", () => (local.replaceChildren(), startGame()));
      b.append(row(go));
      setTimeout(() => go.focus(), 50);
    }
  }

  // =====================================================================
  // Hot seat (solo, or the lead in two-player)
  // =====================================================================
  async function startGame() {
    const t = ++T;
    const used = new Set();
    const tiers = TIERS[mode] || TIERS.normal;
    G = { used, tiers, qs: tiers.map((tier) => draw(tier, used)), log: [], expert: null };
    const outfit = V.outfit;
    V = blankV();
    V.outfit = outfit;
    V.mode = mode;
    V.duo = duo();
    V.names = { lead: playerName, partner: duo() ? otherName() : "" };
    V.scr = "play";
    lastQid = lastModal = null;
    setHost("happy", "namaste");
    await say(duo() ? line("welcomeDuo", { name: playerName, partner: V.names.partner }) : line("welcome", { name: playerName }), { ms: 3200 });
    if (!alive(t)) return;
    askQuestion();
  }

  async function askQuestion() {
    const t = ++T;
    const q = Q();
    markSeen(q.id);
    stopTimer();
    if (fireworks) fireworks.stop();
    G.expert = null;
    Object.assign(V, { q: { id: q.id, q: q.q, opts: q.opts }, shown: 0, removed: [], poll: null, sel: -1, phase: "reading", ans: -1, timer: null, modal: null, suggest: -1, tense: false });
    setHost(V.i >= 14 ? "proud" : null, null);
    const intro = V.i === 14 ? line("q15") : V.i === 15 ? line("q16") : V.i === 16 ? line("q17") : line("q", { n: V.i + 1, amt: money(LADDER[V.i]) });
    await say(intro, { ms: V.i >= 14 ? 2600 : 1500 });
    if (!alive(t)) return;
    if (V.i === 10) {
      await say(line("noClock"), { ms: 2000 });
      if (!alive(t)) return;
    }
    await revealOptions(t);
  }
  async function revealOptions(t) {
    // read the question, then the options come up one by one
    setHost(null, null);
    V.say = "";
    V.talk = true;
    commit();
    await wait(Math.min(2400, 600 + V.q.q.length * 12));
    for (let j = 0; j < 4; j++) {
      if (!alive(t)) return;
      V.shown = j + 1;
      commit();
      await wait(450);
    }
    if (!alive(t)) return;
    V.talk = false;
    V.phase = "answer";
    const sec = timeOf(V.i);
    V.say = sec ? `${sec} seconds on the clock.` : "No clock. Take your time.";
    commit();
    startTimer(sec, t);
  }

  function tapOption(j) {
    if (V.phase !== "answer" || V.removed.includes(j)) return;
    if (!isLead()) return netSend({ t: "suggest", j });
    V.sel = j;
    nudge.last = Date.now();
    say(line("lockAsk", { L: LETTERS[j] }), { ms: 1600 });
  }

  // ---------- the clock, and the host's nudges ----------
  const TM = { id: 0, paused: false };
  const nudge = { last: 0, count: 0 };
  function startTimer(sec, t) {
    stopTimer();
    V.timer = sec ? { left: sec, total: sec } : null;
    nudge.last = Date.now();
    nudge.count = 0;
    const start = Date.now();
    TM.paused = false;
    TM.id = setInterval(() => {
      if (!alive(t) || V.phase !== "answer") return;
      const now = Date.now();
      if (TM.paused) {
        nudge.last = now;
        return;
      }
      if (V.timer) {
        V.timer.left--;
        if (V.timer.left <= 0) {
          stopTimer();
          commit();
          return timeUp();
        }
      }
      // the host chips in when you've been quiet for a while
      const quiet = (now - nudge.last) / 1000;
      const gap = V.timer ? (nudge.count ? 15 : 18) : nudge.count ? 30 : 22;
      if (quiet >= gap && now - start > 8000 && !sayDone) {
        nudge.last = now;
        nudge.count++;
        const ponder = Math.random() < 0.5;
        setHost(ponder ? "think" : null, ponder ? "think" : "open");
        say(nudgeText(), { ms: 3600 }).then(() => {
          if (alive(t) && V.phase === "answer") {
            setHost(null, null);
            commit();
          }
        });
      } else commit();
    }, 1000);
  }
  function stopTimer() {
    clearInterval(TM.id);
    TM.id = 0;
  }
  function nudgeCtx() {
    const lifeLeft = LIFE.filter(([k]) => V.life[k]).map(([, , label]) => label);
    const nextPadav = V.i < 4 ? 4 : V.i < 9 ? 9 : -1;
    return {
      lifeLeft, left: V.timer ? V.timer.left : 0, next: money(LADDER[V.i]), won: V.won, amt: money(LADDER[V.i]), i: V.i, sel: V.sel,
      toPadav: nextPadav < 0 ? 0 : nextPadav - V.i + 1, safe: safeBelow(V.i), partner: V.duo ? V.names.partner : "",
    };
  }

  // ---------- lock in, reveal ----------
  async function lockIn() {
    if (V.phase !== "answer" || V.sel < 0 || !isLead()) return;
    const t = ++T;
    stopTimer();
    V.phase = "locked";
    V.timer = null;
    setHost("think", null);
    await say(line("locked", { L: LETTERS[V.sel] }), { ms: 1200 });
    if (!alive(t)) return;
    V.tense = true;
    V.say = "…";
    commit();
    await wait(1400 + Math.min(4, Q().tier) * 450 + (V.i >= 14 ? 900 : 0));
    if (!alive(t)) return;
    V.tense = false;
    reveal(t);
  }
  async function reveal(t) {
    const q = Q();
    const right = V.sel === q.ans;
    V.ans = q.ans;
    G.log.push({ i: V.i, right });
    if (!right) {
      setHost("sad", null);
      V.won = safeBelow(V.i);
      await say(line("wrong", { L: LETTERS[q.ans], opt: q.opts[q.ans] }), { ms: 2400 });
      if (!alive(t)) return;
      return solution("wrong");
    }
    V.won = LADDER[V.i];
    if (V.i >= 15) {
      // one crore, or seven: the host leaves his desk and celebrates across the whole wall
      setHost("laugh", "cheer");
      fx({ k: "celebrate", title: V.i === 16 ? "₹7 CRORE!" : "₹1 CRORE!", sub: playerName.toUpperCase(), ms: 6500 });
      say(line(V.i === 16 ? "jackpot" : "crore", { name: playerName }), { ms: 6000 });
      await wait(6700);
      if (!alive(t)) return;
      if (V.i === 16) return endGame(true);
      setHost("proud", "clap");
      return solution("right");
    }
    if (PADAV.has(V.i)) {
      setHost("proud", "clap");
      V.banner = { id: ++seq, title: V.i === 4 ? "FIRST PADAV" : "SECOND PADAV", sub: money(V.won) + " is safe" };
      fx({ k: "pataka", level: 2 });
      await say(line(V.i === 4 ? "padav" : "padav2", { amt: money(V.won) }), { ms: 2800 });
    } else {
      setHost(V.i >= 12 ? "laugh" : "happy", V.i >= 12 ? "open" : null);
      fx({ k: "pataka", level: V.i >= 12 ? 2 : 1 });
      await say(line("right", { amt: money(V.won) }), { ms: 1800 });
    }
    if (!alive(t)) return;
    solution("right");
  }
  async function timeUp() {
    if (V.phase !== "answer") return;
    const t = ++T;
    const q = Q();
    V.phase = "locked";
    V.ans = q.ans;
    V.timer = null;
    G.log.push({ i: V.i, right: false });
    setHost("sad", null);
    // as on the show, running out of time ends the game with what you've already won
    await say(line("timeup", { L: LETTERS[q.ans], opt: q.opts[q.ans] }), { ms: 2400 });
    if (!alive(t)) return;
    solution("timeup");
  }
  async function quitGame() {
    if (V.phase !== "answer" || !isLead()) return;
    TM.paused = true;
    const ok = await ask("Quit the game?", `You'll walk away with ${money(V.won)}. You'll still see the right answer.`, `Quit with ${money(V.won)}`, "Keep playing");
    if (!ok || V.phase !== "answer") {
      TM.paused = false;
      return;
    }
    const t = ++T;
    stopTimer();
    const q = Q();
    V.phase = "locked";
    V.ans = q.ans;
    V.timer = null;
    G.log.push({ i: V.i, right: false, quit: true });
    setHost(null, "open");
    await say(line("quit", { amt: money(V.won), L: LETTERS[q.ans], opt: q.opts[q.ans] }), { ms: 2600 });
    if (!alive(t)) return;
    solution("quit");
  }

  // the full solution after every question
  function solution(kind) {
    const q = Q();
    let expert = null;
    if (G.expert) expert = `${G.expert.who} said ${LETTERS[G.expert.guess]}. ${G.expert.guess === q.ans ? "Spot on." : "Not this time."}`;
    V.modal = { id: ++seq, k: "sol", kind, pick: V.sel, why: q.why, expert, i: V.i };
    commit();
  }
  function solutionCard(m, controller) {
    const b = box(layer, "kbc-sol " + m.kind);
    const head = el("div", "kbc-sol-head");
    const chip = { right: "✓ Correct", wrong: "✗ Wrong answer", timeup: "Time's up", quit: "You quit" }[m.kind];
    head.append(el("span", "kbc-chip " + m.kind, chip), el("span", "kbc-sol-amt", m.kind === "right" ? `Won ${money(V.won)}` : `Taking home ${money(V.won)}`));
    b.append(head, el("p", "kbc-sol-q", `Q${m.i + 1}. ${V.q.q}`));
    const list = el("ul", "kbc-sol-opts");
    V.q.opts.forEach((o, j) => {
      const li = el("li", j === V.ans ? "ans" : j === m.pick ? "pick" : "");
      li.append(el("b", null, LETTERS[j]), el("span", null, o));
      if (j === V.ans) li.append(el("em", null, "right answer"));
      else if (j === m.pick) li.append(el("em", null, V.duo ? "locked" : "your pick"));
      list.append(li);
    });
    b.append(list, el("p", "kbc-label", "Solution"), el("p", "kbc-why", m.why));
    if (m.expert) b.append(el("p", "kbc-expert-note", m.expert));
    if (m.kind === "right" && PADAV.has(m.i)) b.append(el("p", "kbc-safe-note", `${money(V.won)} is now safe. You can't leave with less.`));
    if (!controller) return b.append(waitNote());
    const next =
      m.kind === "right" && m.i < N - 1
        ? button(`Next: ${money(LADDER[m.i + 1])} question  →`, "gold big", () => {
            V.i = m.i + 1;
            V.modal = null;
            askQuestion();
          })
        : button("See your winnings  →", "gold big", () => endGame(false));
    b.append(row(next));
    setTimeout(() => next.focus(), 60);
  }

  // =====================================================================
  // Lifelines
  // =====================================================================
  async function useLife(k) {
    if (V.phase !== "answer" || !V.life[k] || !isLead()) return;
    V.life[k] = false;
    nudge.last = Date.now();
    const q = Q();
    const t = T;
    if (k === "fifty") {
      const wrong = shuffle([0, 1, 2, 3].filter((j) => j !== q.ans && !V.removed.includes(j)));
      wrong.slice(0, Math.min(2, wrong.length - 1)).forEach((j) => {
        V.removed.push(j);
        if (V.sel === j) V.sel = -1;
        if (V.suggest === j) V.suggest = -1;
      });
      say(line("fifty"), { ms: 1400 });
    } else if (k === "poll") {
      TM.paused = true;
      V.poll = makePoll(q);
      V.modal = { id: ++seq, k: "poll", p: V.poll };
      say(line("poll"), { ms: 1400 });
    } else if (k === "expert") {
      TM.paused = true;
      await say(line("expert"), { ms: 1300 });
      if (t !== T || V.phase !== "answer") return;
      const x = expertAdvice(q);
      G.expert = x;
      V.modal = { id: ++seq, k: "expert", who: x.who, role: x.role, text: x.text };
      setHost("think", "think");
      commit();
    } else if (k === "flip") {
      stopTimer();
      V.phase = "reading";
      await say(line("flip"), { ms: 1300 });
      if (t !== T) return;
      const t2 = ++T;
      G.qs[V.i] = draw(G.tiers[V.i], G.used);
      const nq = G.qs[V.i];
      markSeen(nq.id);
      G.expert = null;
      Object.assign(V, { q: { id: nq.id, q: nq.q, opts: nq.opts }, shown: 0, removed: [], poll: null, sel: -1, suggest: -1 });
      commit();
      await revealOptions(t2);
    }
  }
  function closeLife() {
    if (!isLead()) return;
    V.modal = null;
    TM.paused = false;
    nudge.last = Date.now();
    setHost(null, null);
    commit();
  }
  function makePoll(q) {
    const base = [74, 60, 47, 37, 30, 27][q.tier];
    const live = [0, 1, 2, 3].filter((j) => !V.removed.includes(j));
    const out = [0, 0, 0, 0];
    let right = Math.round(base + rnd(-8, 12));
    if (live.length === 2) right = Math.min(95, right + 18);
    const others = live.filter((j) => j !== q.ans);
    const w = others.map(() => rnd(0.4, 1.6));
    const sum = w.reduce((a, b) => a + b, 0);
    others.forEach((j, n) => (out[j] = Math.round(((100 - right) * w[n]) / sum)));
    out[q.ans] = 100 - others.reduce((a, j) => a + out[j], 0);
    return out;
  }
  function expertAdvice(q) {
    const sure = Math.random() < [1, 1, 0.95, 0.85, 0.75, 0.65][q.tier];
    const live = [0, 1, 2, 3].filter((j) => !V.removed.includes(j));
    const guess = sure ? q.ans : pick(live.filter((j) => j !== q.ans));
    const p = sure ? Math.round([95, 90, 85, 75, 68, 62][q.tier] + rnd(-5, 5)) : Math.round(rnd(38, 55));
    const [who, role] = pick(EXPERTS);
    const parts = [pick(X_OPEN)];
    const clue = sure ? clueFrom(q) : null;
    if (clue) parts.push(fill(pick(X_CLUE), { c: clue }));
    parts.push(fill(pick(sure ? X_SURE : X_UNSURE), { L: LETTERS[guess], opt: q.opts[guess], p }));
    return { who, role, text: parts.join(" "), guess };
  }

  // =====================================================================
  // The end
  // =====================================================================
  async function endGame(jackpot) {
    const t = ++T;
    stopTimer();
    const amt = V.won;
    V.phase = "done";
    V.scr = "end";
    V.q = null;
    V.modal = { id: ++seq, k: "end", amt, jackpot, right: G.log.filter((x) => x.right).length, quit: G.log.some((x) => x.quit) };
    if (amt) {
      setHost(jackpot ? "laugh" : "proud", "namaste");
      fx({ k: "pataka", level: jackpot || amt >= 1e6 ? 3 : 2 });
    } else setHost("sad", null);
    commit();
    await wait(500);
    if (!alive(t)) return;
    say(line(jackpot ? "jackpot" : amt ? "end" : "endZero", { name: V.names.lead, amt: money(amt) }), { ms: 5000 });
  }
  function endCard(m, controller) {
    const b = box(layer, "kbc-end");
    const cheque = el("div", "kbc-cheque" + (m.jackpot ? " jackpot" : ""));
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const top = el("div", "kbc-cq-top");
    top.append(el("span", null, "CROREPATI BANK"), el("span", null, today));
    const pay = el("div", "kbc-cq-pay");
    pay.append(el("small", null, "Pay"), el("b", null, V.duo ? `${V.names.lead} & ${V.names.partner}` : V.names.lead));
    const amtBox = el("div", "kbc-cq-amt");
    const amtEl = el("b", null, "0");
    amtBox.append(el("small", null, "₹"), amtEl);
    cheque.append(top, pay, el("div", "kbc-cq-words", amountInWords(m.amt)), amtBox, el("div", "kbc-cq-sign", "Host"));
    b.append(el("p", "kbc-eyebrow", m.jackpot ? "Crorepati!" : "Game over"), cheque, el("p", "kbc-p center", `${m.right} of ${N} answered correctly${m.quit ? " · walked away while ahead" : ""}.`));
    if (controller)
      b.append(
        row(
          button("Exit", "", () => close(true)),
          button("Play again", "gold", () => {
            V.outfit = newOutfit();
            if (!duo() && store.get("fff", true)) startFFF();
            else startGame();
          })
        )
      );
    else b.append(waitNote(), row(button("Leave", "", () => close(true))));
    const t0 = performance.now(), dur = m.amt ? 1800 : 1;
    const step = (now) => {
      if (!amtEl.isConnected) return;
      const k = Math.min(1, (now - t0) / dur);
      amtEl.textContent = Math.round(m.amt * (1 - Math.pow(1 - k, 3))).toLocaleString("en-IN");
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // =====================================================================
  // Help
  // =====================================================================
  function showHelp() {
    const prev = [...local.childNodes];
    if (isLead()) TM.paused = true;
    const b = box(local, "kbc-help");
    b.append(el("p", "kbc-eyebrow", "How to play"), el("h3", "kbc-h", "Seventeen questions to ₹7 Crore"));
    const ol = el("ol", "kbc-steps");
    [
      ["⚡", "Fastest Finger First", "Solo games start by racing nine others to put four items in order. A right order wins the hot seat; a quick near miss usually does too."],
      ["◷", "The clock", "45 seconds for questions 1–5, 60 seconds for 6–10, and no clock from question 11. Run out of time and you leave with what you've won."],
      ["▣", "Padav", "₹10,000 (Q5) and ₹3,20,000 (Q10) are padavs. A wrong answer drops you back to the last padav you passed."],
      ["✚", "Four lifelines", "50:50, Audience poll, Ask the expert and Flip the question. The clock pauses while you use one."],
      ["◐", "Normal or Tough", "Normal climbs like the show, from everyday questions to deep cuts. Tough starts hard and stays hard."],
      ["⚇", "Two players", "Create a room and share the code. You lock the answers and use the lifelines; your partner sees everything, taps an answer to suggest it, and you both chat."],
      ["⌨", "Keys", "A–D or 1–4 to choose, Enter to lock in and to move on."],
    ].forEach(([i, h, s], k) => {
      const li = el("li");
      li.style.setProperty("--d", `${0.05 + k * 0.08}s`);
      const w = el("div");
      w.append(el("b", null, h), el("span", null, s));
      li.append(el("i", null, i), w);
      ol.append(li);
    });
    b.append(ol);
    const ok = button("Got it", "gold", () => {
      local.replaceChildren(...prev);
      TM.paused = false;
    });
    b.append(row(ok));
    setTimeout(() => ok.focus(), 50);
  }
  $("#kbcHelpBtn").addEventListener("click", showHelp);
  $("#kbcLadderBtn").addEventListener("click", () => root.classList.toggle("ladder-open"));
  $("#kbcLadder").addEventListener("click", () => root.classList.remove("ladder-open"));

  // =====================================================================
  // Keys, open, close
  // =====================================================================
  root.addEventListener("keydown", (e) => {
    e.stopPropagation(); // keep Avdle's map keys out of this screen
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (V.scr !== "play" || V.phase !== "answer" || layer.childNodes.length || local.childNodes.length) return;
    const j = "abcd".indexOf(e.key.toLowerCase());
    const n = "1234".indexOf(e.key);
    if (e.key.length === 1 && (j >= 0 || n >= 0)) tapOption(j >= 0 ? j : n);
    else if (e.key === "Enter" && V.sel >= 0 && isLead()) {
      e.preventDefault();
      lockIn();
    }
  });

  function open(opts = {}) {
    root.hidden = false;
    document.body.classList.add("kbc-open");
    showIntro();
    if (opts.join) showJoin(opts.join);
    if (hostLED) requestAnimationFrame(() => hostLED.start());
  }
  async function close(force) {
    const mid = V.scr === "play" && isLead() && V.phase !== "done";
    if (!force && mid) {
      TM.paused = true;
      const ok = await ask("Leave the hot seat?", `This game ends and your winnings (${money(V.won)}) are lost.`, "Leave", "Keep playing");
      if (!ok) {
        TM.paused = false;
        return;
      }
    }
    T++;
    stopTimer();
    if (sayDone) sayDone();
    if (fireworks) fireworks.stop();
    if (celebration) celebration.stop();
    if (duo()) netLeave();
    layer.replaceChildren();
    local.replaceChildren();
    G = null;
    root.hidden = true;
    root.classList.remove("ladder-open", "chat-open");
    document.body.classList.remove("kbc-open");
  }
  $("#kbcExit").addEventListener("click", () => close(false));
  for (const b of document.querySelectorAll("[data-kbc]"))
    b.addEventListener("click", () => {
      b.closest("dialog")?.close();
      open();
    });

  window.KBC = { open, close };
  const qs = new URLSearchParams(location.search);
  if (qs.get("kbcroom")) open({ join: qs.get("kbcroom").toUpperCase().slice(0, 4) });
  else if (qs.has("kbc")) open();
})();
