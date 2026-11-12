// Crorepati effects: the host on an LED wall, the full-screen celebration, and dot-matrix fireworks (pataka).
// The host is an original character: silver swept-back hair, spectacles, a grey French beard, and a
// different outfit every game. He's painted with soft shading into a small buffer, then shown
// through an LED dot mask, like a face on a studio video wall.
(() => {
  "use strict";
  const rnd = (a, b) => a + Math.random() * (b - a);
  function seeded(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  const OUTFITS = [
    { name: "Black tuxedo and bow tie", coat: "#1c1c24", lapel: "#2c2c36", shirt: "#f2f2f2", kind: "bowtie", acc: "#a8102a", pocket: "#f2f2f2" },
    { name: "Navy bandhgala with gold buttons", coat: "#1d2c66", kind: "bandhgala", acc: "#e9c25c" },
    { name: "Maroon velvet jacket", coat: "#641426", lapel: "#43091a", shirt: "#f2f2f2", kind: "tie", tie: "#17171c", pocket: "#e9c25c" },
    { name: "Charcoal three-piece suit", coat: "#474a52", lapel: "#33353b", shirt: "#e6edf6", kind: "tie", tie: "#2c5fb8", vest: "#33353b" },
    { name: "Ivory sherwani with a red shawl", coat: "#ece0c2", kind: "sherwani", acc: "#b48628", shawl: "#93172e" },
    { name: "Bottle-green jodhpuri with a brooch", coat: "#12493a", kind: "bandhgala", acc: "#e9c25c", brooch: true },
    { name: "Black kurta and Nehru jacket", coat: "#2b2b32", kind: "nehru", acc: "#d0d0d0", shirt: "#141418" },
    { name: "Checked blazer and red muffler", coat: "#56432f", check: "#76604a", lapel: "#3f3022", shirt: "#f2f2f2", kind: "muffler", muffler: "#a91d2f" },
    { name: "Midnight-blue suit and silver tie", coat: "#19214b", lapel: "#101631", shirt: "#ffffff", kind: "tie", tie: "#bfc6d2", pocket: "#ffffff" },
    { name: "Saffron Nehru jacket", coat: "#c8702a", kind: "nehru", acc: "#fff0c6", shirt: "#f2eee4" },
    { name: "Plum bandhgala with silver buttons", coat: "#4a2475", kind: "bandhgala", acc: "#e3e3ee" },
    { name: "White tuxedo and black bow tie", coat: "#e9e7e1", lapel: "#d2d0c8", shirt: "#ffffff", kind: "bowtie", acc: "#17171c", pocket: "#a8102a" },
  ];

  // fixed texture for hair strands and beard bristles, so they don't shimmer between frames
  const R = seeded(7);
  const STRANDS = Array.from({ length: 34 }, () => ({ x: 25 + R() * 30, w: R(), c: R() }));
  const BRISTLES = Array.from({ length: 140 }, () => ({ x: 32 + R() * 16, y: 46 + R() * 17, c: R() }));

  // ---------------------------------------------------------------------
  // Painting the host (80 × 100 design units)
  // ---------------------------------------------------------------------
  function drawHost(g, s) {
    const o = s.outfit;
    const SKIN = "#d7a07a", SKIN_HI = "#ebbd98", SKIN_LO = "#a9714f";
    const t = s.t || 0;
    g.save();
    g.translate(0, s.bob || 0);
    const P = (pts) => {
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.closePath();
    };
    const fillP = (pts, f) => {
      P(pts);
      g.fillStyle = f;
      g.fill();
    };
    const L = (pts, c, w) => {
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.strokeStyle = c;
      g.lineWidth = w;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.stroke();
    };
    const E = (x, y, rx, ry, f, rot = 0) => {
      g.beginPath();
      g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      g.fillStyle = f;
      g.fill();
    };
    const lin = (x0, y0, x1, y1, stops) => {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([p, c]) => gr.addColorStop(p, c));
      return gr;
    };

    // ---- torso ----
    g.beginPath();
    g.moveTo(0, 101);
    g.bezierCurveTo(2, 80, 15, 72, 40, 71);
    g.bezierCurveTo(65, 72, 78, 80, 80, 101);
    g.closePath();
    g.fillStyle = lin(0, 0, 80, 0, [[0, shade(o.coat, -0.35)], [0.35, shade(o.coat, 0.12)], [0.55, shade(o.coat, 0.05)], [1, shade(o.coat, -0.45)]]);
    g.fill();
    if (o.check) {
      g.save();
      g.clip();
      g.globalAlpha = 0.55;
      for (let x = 0; x < 80; x += 4.5) L([x, 70, x, 101], o.check, 0.7);
      for (let y = 72; y < 101; y += 4.5) L([0, y, 80, y], o.check, 0.7);
      g.restore();
    }
    // neck with a shadow under the chin
    g.fillStyle = lin(0, 56, 0, 72, [[0, SKIN_LO], [1, SKIN]]);
    g.fillRect(33.5, 54, 13, 18);

    if (o.kind === "bowtie" || o.kind === "tie" || o.kind === "muffler") {
      fillP([31, 70, 40, 92, 49, 70], lin(0, 70, 0, 92, [[0, o.shirt], [1, shade(o.shirt, -0.18)]]));
      L([33.5, 70, 40, 72.5, 46.5, 70], shade(o.shirt, -0.25), 0.6);
      if (o.vest) fillP([33, 82, 47, 82, 46, 101, 34, 101], shade(o.vest, -0.1));
      if (o.kind === "tie") {
        fillP([38.6, 72.2, 41.4, 72.2, 42.4, 76, 41, 91, 39, 91, 37.6, 76], lin(36, 0, 44, 0, [[0, shade(o.tie, -0.2)], [0.5, shade(o.tie, 0.15)], [1, shade(o.tie, -0.25)]]));
        fillP([38.4, 72, 41.6, 72, 41.2, 75, 38.8, 75], shade(o.tie, -0.15));
      }
      fillP([31, 69, 40, 93, 26, 79], lin(26, 70, 40, 92, [[0, shade(o.lapel, 0.2)], [1, shade(o.lapel, -0.2)]]));
      fillP([49, 69, 40, 93, 54, 79], lin(54, 70, 40, 92, [[0, shade(o.lapel, 0.1)], [1, shade(o.lapel, -0.3)]]));
      L([31, 69, 26, 79], shade(o.lapel, 0.35), 0.6);
      if (o.kind === "bowtie") {
        fillP([33, 71, 40, 74, 33, 77.5], shade(o.acc, 0.05));
        fillP([47, 71, 40, 74, 47, 77.5], shade(o.acc, -0.15));
        E(40, 74, 1.7, 1.9, shade(o.acc, -0.25));
      }
      if (o.kind === "muffler") {
        g.fillStyle = shade(o.muffler, -0.1);
        g.fillRect(31, 65, 18, 6);
        fillP([33, 70, 37, 70, 36, 97, 32, 96], shade(o.muffler, 0.05));
        fillP([43, 70, 47, 70, 49, 92, 45, 93], shade(o.muffler, -0.15));
      }
      if (o.pocket) fillP([57, 84, 63, 83, 61, 80], o.pocket);
      [87, 94].forEach((y) => E(41.8, y, 0.8, 0.8, "#0b0b0e"));
    } else {
      const band = o.kind === "nehru" ? 67 : 64;
      if (o.kind === "nehru") fillP([35, 68, 40, 80, 45, 68], o.shirt);
      g.fillStyle = lin(0, band, 0, band + 7, [[0, shade(o.coat, 0.15)], [1, shade(o.coat, -0.2)]]);
      g.fillRect(32, band, 16, 7);
      L([32, band + 7, 40, band + 9, 48, band + 7], "rgba(0,0,0,.4)", 0.8);
      L([40.3, band + 9, 40.3, 101], "rgba(0,0,0,.35)", 0.8);
      for (let y = band + 13; y < 100; y += 6) {
        E(41.6, y, 1.1, 1.1, shade(o.acc, -0.2));
        E(41.3, y - 0.3, 0.45, 0.45, shade(o.acc, 0.5));
      }
      if (o.brooch) {
        E(27, 81, 2.6, 2.6, o.acc);
        E(27, 81, 1.1, 1.1, "#b0142e");
      }
      if (o.shawl) {
        P([12, 77, 20, 73, 60, 101, 47, 101]);
        g.fillStyle = lin(12, 75, 55, 101, [[0, shade(o.shawl, 0.15)], [1, shade(o.shawl, -0.3)]]);
        g.fill();
        L([18, 75, 54, 101], o.acc, 0.8);
      }
    }

    // ---- arms (behind the head, in front of the torso) ----
    const sleeve = (pts) => {
      L(pts, shade(o.coat, -0.3), 7.5);
      L(pts, shade(o.coat, 0.02), 6);
    };
    const hand = (x, y, r = 2.6) => {
      E(x, y, r, r * 1.1, SKIN);
      E(x - 0.6, y - 0.6, r * 0.5, r * 0.5, SKIN_HI);
    };
    const pose = s.pose;
    if (pose === "namaste") {
      sleeve([12, 101, 22, 94, 36, 90]);
      sleeve([68, 101, 58, 94, 44, 90]);
      fillP([37.6, 96, 40, 76, 42.4, 96], SKIN);
      L([40, 78, 40, 95], SKIN_LO, 0.7);
    } else if (pose === "clap") {
      const gap = Math.abs(Math.sin(t / 110)) * 5;
      sleeve([12, 101, 22, 93, 37 - gap, 86]);
      sleeve([68, 101, 58, 93, 43 + gap, 86]);
      hand(37.5 - gap, 84.5);
      hand(42.5 + gap, 84.5);
    } else if (pose === "cheer") {
      const w = Math.sin(t / 140) * 4;
      sleeve([13, 84, 6 + w, 64, 9 + w, 46]);
      sleeve([67, 84, 74 - w, 64, 71 - w, 46]);
      hand(9 + w, 43.5, 3);
      hand(71 - w, 43.5, 3);
    } else if (pose === "think") {
      sleeve([68, 101, 60, 88, 47, 70]);
      hand(45.5, 63.5, 2.7);
    } else if (pose === "open") {
      sleeve([12, 101, 8, 90, 4, 82]);
      sleeve([68, 101, 72, 90, 76, 82]);
      hand(3.5, 80.5);
      hand(76.5, 80.5);
    }

    // ---- head ----
    E(25.8, 40, 2.7, 4.4, SKIN_LO);
    E(54.2, 40, 2.7, 4.4, SKIN_LO);
    E(40, 22.5, 16.5, 11.5, "#bdbdbd"); // hair volume behind
    const face = g.createRadialGradient(36, 33, 2, 40, 40, 21);
    face.addColorStop(0, SKIN_HI);
    face.addColorStop(0.55, SKIN);
    face.addColorStop(1, SKIN_LO);
    E(40, 38, 14.2, 18.2, face);
    // cheekbones and the shadow under the hairline
    E(32.5, 45, 3.5, 2.4, "rgba(190,110,90,.18)");
    E(47.5, 45, 3.5, 2.4, "rgba(190,110,90,.18)");
    // hair: swept back, silver with dark and light strands
    g.beginPath();
    g.moveTo(25.4, 35);
    g.bezierCurveTo(23.5, 17, 33.5, 10.5, 42, 11);
    g.bezierCurveTo(52.5, 11.5, 57.5, 19, 54.6, 35);
    g.bezierCurveTo(53, 26.5, 48, 23.2, 41, 24);
    g.bezierCurveTo(34, 23.2, 28.5, 26.5, 25.4, 35);
    g.fillStyle = lin(0, 10, 0, 34, [[0, "#f4f4f4"], [0.55, "#d9d9d9"], [1, "#9d9d9d"]]);
    g.fill();
    g.save();
    g.clip();
    for (const st of STRANDS) {
      const x = st.x;
      L([x, 24, x - 2 - st.w * 3, 15, x - 1 - st.w * 4, 11], st.c > 0.5 ? "rgba(255,255,255,.55)" : "rgba(110,110,110,.45)", 0.45);
    }
    g.restore();
    g.fillStyle = "#c8c8c8";
    g.fillRect(25.2, 30, 2.3, 11);
    g.fillRect(52.5, 30, 2.3, 11);
    E(40, 26.5, 12, 2.2, "rgba(120,70,45,.16)");

    // brows
    const browLift = { proud: -1.1, laugh: -1, surprised: -2.2, sad: 0.9, think: 0 }[s.mood] || 0;
    const thinkTilt = s.mood === "think" ? -1 : 0;
    L([30.8, 32.9 + browLift, 34, 31.9 + browLift + thinkTilt, 37.2, 32.4 + browLift], "#d0d0d0", 1.4);
    L([42.8, 32.4 + browLift, 46, 31.9 + browLift, 49.2, 32.9 + browLift + (s.mood === "sad" ? -0.8 : 0)], "#d0d0d0", 1.4);
    // eye sockets
    E(34, 38, 3.6, 2.4, "rgba(120,70,45,.20)");
    E(46, 38, 3.6, 2.4, "rgba(120,70,45,.20)");
    // eyes (smile-squint when laughing)
    if (s.blink || s.mood === "laugh") {
      L([32, 38.2, 34, 37.4, 36, 38.2], "#3a2a22", 0.8);
      L([44, 38.2, 46, 37.4, 48, 38.2], "#3a2a22", 0.8);
    } else {
      const big = s.mood === "surprised" ? 1.25 : 1;
      E(34, 37.9, 1.9 * big, 1.25 * big, "#f1ece6");
      E(46, 37.9, 1.9 * big, 1.25 * big, "#f1ece6");
      const look = s.look || 0;
      E(34.2 + look, 37.9, 1.05, 1.15, "#2a1a10");
      E(46.2 + look, 37.9, 1.05, 1.15, "#2a1a10");
      E(33.8 + look, 37.5, 0.35, 0.35, "rgba(255,255,255,.8)");
      E(45.8 + look, 37.5, 0.35, 0.35, "rgba(255,255,255,.8)");
    }
    // spectacles
    g.lineWidth = 0.85;
    g.strokeStyle = "#151515";
    g.beginPath();
    g.roundRect(29.4, 34.8, 9.2, 6.4, 2);
    g.roundRect(41.4, 34.8, 9.2, 6.4, 2);
    g.stroke();
    L([38.6, 36.8, 41.4, 36.8], "#151515", 0.8);
    L([29.4, 36.6, 26.2, 37.6], "#151515", 0.8);
    L([50.6, 36.6, 53.8, 37.6], "#151515", 0.8);
    L([30.6, 35.8, 32.4, 35.4], "rgba(255,255,255,.35)", 0.5);
    L([42.6, 35.8, 44.4, 35.4], "rgba(255,255,255,.35)", 0.5);
    // nose
    L([40.3, 39, 39.3, 44.6, 41.5, 45.8], SKIN_LO, 0.8);
    E(41.8, 43, 1.2, 2.6, "rgba(255,230,200,.25)");
    E(38.6, 45.6, 1.1, 0.6, "rgba(90,50,30,.35)");
    E(41.6, 45.6, 1.1, 0.6, "rgba(90,50,30,.35)");

    // French beard: a moustache joined down to a pointed goatee, with bristle texture
    const BEARD = lin(0, 46, 0, 63, [[0, "#e9e9e9"], [1, "#bdbdbd"]]);
    P([35.4, 51, 44.6, 51, 46.2, 56, 43.2, 61.4, 40, 62.6, 36.8, 61.4, 33.8, 56]);
    g.fillStyle = BEARD;
    g.fill();
    L([33.3, 49.8, 35.1, 55.2], "#d9d9d9", 2.1);
    L([46.7, 49.8, 44.9, 55.2], "#d9d9d9", 2.1);
    P([32.6, 50.4, 36, 47.3, 40, 46.6, 44, 47.3, 47.4, 50.4, 44, 49.5, 40, 49.3, 36, 49.5]);
    g.fillStyle = "#e4e4e4";
    g.fill();
    g.save();
    P([32.6, 50.4, 36, 47.3, 40, 46.6, 44, 47.3, 47.4, 50.4, 46.2, 56, 43.2, 61.4, 40, 62.6, 36.8, 61.4, 33.8, 56]);
    g.clip();
    for (const b of BRISTLES) E(b.x, b.y, 0.32, 0.32, b.c > 0.55 ? "rgba(255,255,255,.7)" : "rgba(120,120,120,.45)");
    g.restore();

    // mouth
    const m = s.mouth || 0;
    const dark = "#3b1510";
    if (s.mood === "laugh") {
      P([35.6, 51.4, 44.4, 51.4, 42.6, 55.6, 37.4, 55.6]);
      g.fillStyle = dark;
      g.fill();
      g.fillStyle = "#f4efe8";
      g.fillRect(36.6, 51.5, 6.8, 1.2);
    } else if (m > 0.12) E(40, 52.4, 3.3, 0.5 + m * 2.3, dark);
    else if (s.mood === "surprised") E(40, 52.8, 1.8, 2.1, dark);
    else if (s.mood === "happy" || s.mood === "proud") {
      P([36, 51.6, 40, 55.4, 44, 51.6, 40, 52.6]);
      g.fillStyle = dark;
      g.fill();
    } else if (s.mood === "sad") L([37, 53.6, 40, 52.1, 43, 53.6], "#6b3a30", 0.9);
    else if (s.mood === "think") L([37.4, 52.6, 40, 52.4, 42.6, 51.8], "#6b3a30", 0.9);
    else L([37, 52.2, 40, 52.6, 43, 52.2], "#6b3a30", 0.9);
    g.restore();
  }

  // ---------------------------------------------------------------------
  // LED output: paint into a small buffer, blow it up, put a dot mask over it, add a soft glow
  // ---------------------------------------------------------------------
  function ledMask(k, bg) {
    const m = document.createElement("canvas");
    m.width = m.height = k;
    const g = m.getContext("2d");
    g.fillStyle = bg;
    g.fillRect(0, 0, k, k);
    g.globalCompositeOperation = "destination-out";
    g.beginPath();
    g.arc(k / 2, k / 2, k * 0.43, 0, Math.PI * 2);
    g.fill();
    return m;
  }
  function blit(ctx, buf, W, H, k, mask) {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(buf, 0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = ctx.createPattern(mask, "repeat");
    ctx.fillRect(0, 0, W, H);
    // glow
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.22;
    ctx.imageSmoothingEnabled = true;
    ctx.filter = `blur(${Math.max(2, k * 0.9)}px)`;
    ctx.drawImage(buf, 0, 0, W, H);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  const GW = 100, GH = 125; // host buffer: 1.25 × the design units
  function Host(canvas, label) {
    const buf = document.createElement("canvas");
    buf.width = GW;
    buf.height = GH;
    const bg = buf.getContext("2d");
    const ctx = canvas.getContext("2d");
    const holder = canvas.parentElement;
    const st = { outfit: OUTFITS[0], mouth: 0, blink: false, mood: null, pose: null, bob: 0, look: 0, t: 0 };
    let raf = 0, last = 0, blinkUntil = 0, nextBlink = 2000, k = 3, mask = null, cssW = 0, lookT = 0;
    function fit() {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return false;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      k = Math.max(2, Math.round((r.width * dpr) / GW));
      canvas.width = GW * k;
      canvas.height = GH * k;
      cssW = r.width;
      mask = ledMask(k, "#05030f");
      return true;
    }
    function frame(now) {
      raf = 0;
      if (!canvas.isConnected || canvas.closest("[hidden]")) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 45) return;
      last = now;
      const r = canvas.getBoundingClientRect();
      if ((!mask || Math.abs(r.width - cssW) > 1) && !fit()) return;
      const cl = holder.classList;
      st.mood = ["laugh", "proud", "surprised", "think", "happy", "sad"].find((m) => cl.contains(m)) || null;
      st.pose = ["namaste", "clap", "cheer", "think", "open"].find((p) => cl.contains("p-" + p)) || null;
      const talk = cl.contains("talk");
      st.mouth = talk ? Math.max(0, 0.5 + 0.5 * Math.sin(now / 60) * (0.6 + 0.4 * Math.sin(now / 190))) : 0;
      if (now > nextBlink) {
        blinkUntil = now + 120;
        nextBlink = now + rnd(2500, 6000);
      }
      if (now > lookT) {
        st.look = [0, 0, -0.5, 0.5][Math.floor(Math.random() * 4)];
        lookT = now + rnd(1500, 4000);
      }
      st.blink = now < blinkUntil;
      st.t = now;
      const excited = st.mood === "laugh" || st.pose === "cheer";
      st.bob = Math.sin(now / 900) * 0.6 + (excited ? Math.abs(Math.sin(now / 150)) * -1.6 : st.mood === "proud" ? Math.sin(now / 300) * 0.5 : 0);
      bg.setTransform(GW / 80, 0, 0, GH / 100, 0, 0);
      bg.clearRect(0, 0, 80, 100);
      // a soft spotlight behind him
      const tense = cl.contains("tense");
      const glow = tense ? 0.55 + 0.45 * Math.sin(now / 90) : 0.75 + 0.25 * Math.sin(now / 1200);
      const sp = bg.createRadialGradient(40, 40, 4, 40, 46, 58);
      sp.addColorStop(0, `rgba(80,60,170,${0.55 * glow})`);
      sp.addColorStop(1, "rgba(20,10,60,0)");
      bg.fillStyle = sp;
      bg.fillRect(0, 0, 80, 100);
      drawHost(bg, st);
      blit(ctx, buf, canvas.width, canvas.height, k, mask);
    }
    return {
      start() {
        fit();
        if (!raf) raf = requestAnimationFrame(frame);
      },
      dress(i) {
        st.outfit = OUTFITS[((i % OUTFITS.length) + OUTFITS.length) % OUTFITS.length];
        if (label) label.textContent = st.outfit.name;
      },
      get outfit() {
        return st.outfit;
      },
      count: OUTFITS.length,
    };
  }

  // ---------------------------------------------------------------------
  // The big moment: the host dances across a full-screen LED wall
  // ---------------------------------------------------------------------
  function Celebration(canvas) {
    const ctx = canvas.getContext("2d");
    let raf = 0, done = null, t0 = 0, dur = 0, opts = null, buf = null, bctx = null, mask = null, k = 6, W = 0, H = 0;
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.round(canvas.clientWidth * dpr);
      H = Math.round(canvas.clientHeight * dpr);
      k = Math.max(4, Math.round(6 * dpr));
      canvas.width = W;
      canvas.height = H;
      buf = document.createElement("canvas");
      buf.width = Math.ceil(W / k);
      buf.height = Math.ceil(H / k);
      bctx = buf.getContext("2d");
      mask = ledMask(k, "#05030f");
    }
    function frame(now) {
      raf = 0;
      const e = now - t0;
      const bw = buf.width, bh = buf.height, g = bctx;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#07041c";
      g.fillRect(0, 0, bw, bh);
      // sweeping spotlights
      for (let i = 0; i < 3; i++) {
        const x = bw * (0.2 + 0.3 * i) + Math.sin(e / 700 + i * 2) * bw * 0.2;
        const gr = g.createRadialGradient(x, bh * 0.15, 1, x, bh * 0.85, bh * 0.75);
        gr.addColorStop(0, ["rgba(255,200,90,.35)", "rgba(140,110,255,.35)", "rgba(90,200,255,.3)"][i]);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, bw, bh);
      }
      // the stage floor
      const fl = g.createRadialGradient(bw / 2, bh * 0.98, 2, bw / 2, bh * 0.98, bw * 0.55);
      fl.addColorStop(0, "rgba(255,210,110,.45)");
      fl.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = fl;
      g.fillRect(0, bh * 0.6, bw, bh * 0.4);
      // the host bounds around the set
      const scale = (bh * 0.62) / 100;
      const hx = bw / 2 + Math.sin(e / 900) * bw * 0.28;
      const hop = Math.abs(Math.sin(e / 210)) * bh * 0.035;
      g.setTransform(scale, 0, 0, scale, hx - 40 * scale, bh - 100 * scale - hop + bh * 0.02);
      drawHost(g, { outfit: opts.outfit, mood: "laugh", pose: "cheer", t: now, bob: 0, mouth: 0 });
      g.setTransform(1, 0, 0, 1, 0, 0);
      // headline
      const pulse = 1 + Math.sin(e / 160) * 0.04;
      const fs = Math.min(bw / (opts.title.length * 0.62), bh * 0.2) * pulse;
      g.font = `900 ${fs}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      const tg = g.createLinearGradient(0, bh * 0.08, 0, bh * 0.3);
      tg.addColorStop(0, "#fff4c8");
      tg.addColorStop(1, "#f0a830");
      g.fillStyle = tg;
      g.fillText(opts.title, bw / 2, bh * 0.19);
      if (opts.sub) {
        g.font = `800 ${Math.max(6, fs * 0.28)}px system-ui, sans-serif`;
        g.fillStyle = "#ffffff";
        g.fillText(opts.sub, bw / 2, bh * 0.34);
      }
      // sparkles
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97.3 + e * 0.03 * (1 + (i % 3))) % bw;
        const sy = (i * 53.7 + e * 0.05 * (1 + (i % 4))) % bh;
        if ((Math.floor(e / 90) + i) % 3 === 0) {
          g.fillStyle = i % 2 ? "#ffe9a8" : "#ffffff";
          g.fillRect(sx, sy, 1, 1);
        }
      }
      blit(ctx, buf, W, H, k, mask);
      if (e < dur) raf = requestAnimationFrame(frame);
      else finish();
    }
    function finish() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      canvas.hidden = true;
      const d = done;
      done = null;
      if (d) d();
    }
    canvas.addEventListener("click", finish);
    return {
      // play({title, sub, outfit, ms}) → resolves when it ends or is tapped away
      play(o) {
        return new Promise((res) => {
          opts = o;
          done = res;
          canvas.hidden = false;
          size();
          t0 = performance.now();
          dur = o.ms || 6500;
          if (!raf) raf = requestAnimationFrame(frame);
        });
      },
      stop: finish,
    };
  }

  // ---------------------------------------------------------------------
  // Dot-matrix fireworks (pataka)
  // ---------------------------------------------------------------------
  function Fireworks(canvas) {
    const ctx = canvas.getContext("2d");
    const PAL = [[255, 211, 107], [255, 86, 86], [110, 210, 255], [140, 255, 150], [255, 130, 225], [255, 255, 255], [255, 160, 60]];
    let cell = 7, cols = 0, rows = 0, Rr, Gg, Bb, W = 0, H = 0;
    let parts = [], rockets = [], raf = 0, timers = [];
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth || innerWidth;
      H = canvas.clientHeight || innerHeight;
      cell = W < 600 ? 6 : 8;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / cell);
      rows = Math.ceil(H / cell);
      Rr = new Float32Array(cols * rows);
      Gg = new Float32Array(cols * rows);
      Bb = new Float32Array(cols * rows);
    }
    function put(x, y, c, kk) {
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
      const i = cy * cols + cx;
      Rr[i] += c[0] * kk;
      Gg[i] += c[1] * kk;
      Bb[i] += c[2] * kk;
    }
    function burst(x, y, big) {
      const c1 = PAL[Math.floor(Math.random() * PAL.length)];
      const c2 = Math.random() < 0.5 ? PAL[Math.floor(Math.random() * PAL.length)] : c1;
      const n = big ? 120 : 80;
      const ring = Math.random() < 0.35;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(-0.05, 0.05);
        const sp = ring ? (big ? 5 : 4) : rnd(0.8, big ? 6 : 4.6);
        const life = rnd(45, 80);
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life, c: i % 2 ? c1 : c2, tw: Math.random() < 0.3 });
      }
    }
    function launch(big) {
      rockets.push({ x: rnd(0.12, 0.88) * W, y: H + 4, vx: rnd(-0.8, 0.8), vy: -rnd(H / 70, H / 52), top: rnd(0.12, 0.42) * H, big });
    }
    function frame() {
      raf = 0;
      for (let i = 0; i < Rr.length; i++) {
        Rr[i] *= 0.8;
        Gg[i] *= 0.8;
        Bb[i] *= 0.8;
      }
      rockets = rockets.filter((r) => {
        r.x += r.vx;
        r.y += r.vy;
        r.vy *= 0.985;
        put(r.x, r.y, [255, 230, 170], 1);
        put(r.x, r.y + cell, [255, 170, 80], 0.5);
        if (r.y <= r.top || r.vy > -1.5) {
          burst(r.x, r.y, r.big);
          return false;
        }
        return true;
      });
      parts = parts.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.975;
        p.vy = p.vy * 0.975 + 0.06;
        p.life--;
        let kk = p.life / p.max;
        if (p.tw && Math.random() < 0.3) kk *= 0.2;
        put(p.x, p.y, p.c, kk * 0.9);
        return p.life > 0;
      });
      ctx.clearRect(0, 0, W, H);
      const rad = cell * 0.38;
      let lit = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const m = Math.max(Rr[i], Gg[i], Bb[i]);
          if (m < 10) continue;
          lit++;
          const s = m > 255 ? 255 / m : 1;
          ctx.fillStyle = `rgb(${(Rr[i] * s) | 0},${(Gg[i] * s) | 0},${(Bb[i] * s) | 0})`;
          ctx.beginPath();
          ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (parts.length || rockets.length || lit) raf = requestAnimationFrame(frame);
      else canvas.hidden = true;
    }
    return {
      // level 1: a couple of bursts, 2: a padav, 3: the grand finale
      fire(level) {
        canvas.hidden = false;
        if (!Rr || canvas.clientWidth !== W || canvas.clientHeight !== H) size();
        const n = [0, 3, 7, 18][level] || 3;
        const span = [0, 700, 1800, 6000][level] || 700;
        for (let i = 0; i < n; i++) timers.push(setTimeout(() => launch(level >= 2 && Math.random() < 0.5), (i / n) * span + rnd(0, 120)));
        if (level >= 2) timers.push(setTimeout(() => burst(W / 2, H * 0.3, true), span * 0.5));
        if (!raf) raf = requestAnimationFrame(frame);
      },
      stop() {
        timers.forEach(clearTimeout);
        timers = [];
        parts = [];
        rockets = [];
        if (Rr) {
          Rr.fill(0);
          Gg.fill(0);
          Bb.fill(0);
        }
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, W, H);
        canvas.hidden = true;
      },
    };
  }

  window.KBCFX = { Host, Celebration, Fireworks, OUTFITS };
})();
