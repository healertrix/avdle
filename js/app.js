// Longshot app: canvas map, game flow, review, "learn more", persistence.
//
// Performance: the map is drawn on a <canvas>. Country shapes are projected once
// into Path2D objects; panning/zooming only changes the canvas transform and
// redraws on the next animation frame. A lighter outline set is used when zoomed
// out, and anything off-screen is skipped.
(() => {
  "use strict";
  const E = window.Engine;
  const TIERS = E.TIERS;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const fmt = (n) => n.toLocaleString("en-US");

  // ---------- storage (never throws) ----------
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("longshot." + k);
        return v == null ? d : JSON.parse(v);
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("longshot." + k, JSON.stringify(v));
      } catch {}
    },
  };
  const settings = Object.assign({ names: true, borders: true, timer: false, night: false }, store.get("settings", {}));
  const stats = Object.assign(
    { daily: { played: 0, streak: 0, maxStreak: 0, best: 0, lastKey: null }, unlimited: { runs: 0, best: 0 }, people: { runs: 0, best: 0 } },
    store.get("stats", {})
  );

  // ---------- state ----------
  const S = {
    mode: null, // "daily" | "unlimited" | "practice"
    dailyKey: null,
    prompts: [],
    idx: 0,
    picks: [],
    sel: null, // { id, part, lonlat }
    phase: "idle", // "pick" | "verdict" | "review"
    reviewIdx: 0,
    deadline: 0,
    runNo: 0,
    recorded: false,
  };

  // =====================================================================
  // Map
  // =====================================================================
  const mapEl = $("#map");
  const canvas = document.createElement("canvas");
  mapEl.append(canvas);
  const ctx = canvas.getContext("2d");

  const hi = topojson.feature(WORLD, WORLD.objects.countries).features;
  const lo = topojson.feature(WORLD_LO, WORLD_LO.objects.countries).features;
  const meshOf = (topo, f) => topojson.mesh(topo, topo.objects.countries, f);
  const hiBorders = meshOf(WORLD, (a, b) => a !== b && a.properties.owner !== b.properties.owner);
  const loBorders = meshOf(WORLD_LO, (a, b) => a !== b && a.properties.owner !== b.properties.owner);
  const hiCoast = meshOf(WORLD, (a, b) => a === b);
  const loCoast = meshOf(WORLD_LO, (a, b) => a === b);
  const onMap = new Set(hi.map((f) => f.properties.owner));
  const markers = E.COUNTRIES.filter((c) => c.area < 2100 || !onMap.has(c.id)).map((c) => ({ c, lonlat: [c.latlng[1], c.latlng[0]], xy: null }));

  let W = 0, H = 0, dpr = 1, proj = null;
  let T = d3.zoomIdentity; // current zoom transform
  const shapes = { hi: [], lo: [], hiBorders: null, loBorders: null, hiCoast: null, loCoast: null };
  let theme = {};
  let patterns = [];
  let deco = [];

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    theme = {
      sea: v("--sea"), land: v("--land"), faded: v("--land-faded"), selected: v("--selected"), disputed: v("--disputed"),
      border: v("--border-ink"), coast: v("--coast"), deco: v("--deco"), hatch: v("--hatch"), wrong: v("--wrong"),
      wax: v("--wax"), waxDark: v("--wax-dark"), paper: v("--paper"),
      tiers: [v("--t0"), v("--t1"), v("--t2"), v("--t3"), v("--t4")],
    };
    makePatterns();
  }

  // Hatch overlays per tier (dots, two diagonals, crosshatch, stars) so tiers read without colour.
  function makePatterns() {
    patterns = [0, 1, 2, 3, 4].map((t) => {
      const s = Math.round((t === 4 ? 10 : 7) * dpr);
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const g = c.getContext("2d");
      g.strokeStyle = g.fillStyle = theme.hatch || "rgba(0,0,0,0.5)";
      g.lineWidth = Math.max(1, dpr);
      g.beginPath();
      if (t === 0) {
        g.arc(s / 2, s / 2, dpr, 0, Math.PI * 2);
        g.fill();
      }
      if (t === 1 || t === 3) {
        g.moveTo(0, s); g.lineTo(s, 0); g.moveTo(-1, 1); g.lineTo(1, -1); g.moveTo(s - 1, s + 1); g.lineTo(s + 1, s - 1);
      }
      if (t === 2 || t === 3) {
        g.moveTo(0, 0); g.lineTo(s, s); g.moveTo(-1, s - 1); g.lineTo(1, s + 1); g.moveTo(s - 1, -1); g.lineTo(s + 1, 1);
      }
      if (t === 1 || t === 2 || t === 3) g.stroke();
      if (t === 4) {
        const m = s / 2, r = s * 0.32;
        g.moveTo(m, m - r); g.lineTo(m + r * 0.25, m - r * 0.25); g.lineTo(m + r, m); g.lineTo(m + r * 0.25, m + r * 0.25);
        g.lineTo(m, m + r); g.lineTo(m - r * 0.25, m + r * 0.25); g.lineTo(m - r, m); g.lineTo(m - r * 0.25, m - r * 0.25);
        g.closePath();
        g.fill();
      }
      return ctx.createPattern(c, "repeat");
    });
  }

  function layout() {
    document.documentElement.style.setProperty("--top-h", $("#topbar").offsetHeight + "px");
    W = mapEl.clientWidth;
    H = mapEl.clientHeight;
    if (!W || !H) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const pad = Math.min(W, H) * 0.03;
    proj = d3.geoNaturalEarth1().fitExtent([[pad, pad + 64], [W - pad, H - pad - 56]], { type: "FeatureCollection", features: hi });
    const gp = d3.geoPath(proj).digits(2);
    const build = (f) => ({ f, owner: f.properties.owner, path: new Path2D(gp(f) || ""), b: gp.bounds(f) });
    shapes.hi = hi.map(build);
    shapes.lo = lo.map(build);
    shapes.hiBorders = new Path2D(gp(hiBorders));
    shapes.loBorders = new Path2D(gp(loBorders));
    shapes.hiCoast = new Path2D(gp(hiCoast));
    shapes.loCoast = new Path2D(gp(loCoast));
    for (const m of markers) m.xy = proj(m.lonlat);
    buildDecorations();
    makePatterns();
    zoom.extent([[0, 0], [W, H]]).translateExtent([[-W * 0.3, -H * 0.3], [W * 1.3, H * 1.3]]);
    d3.select(canvas).call(zoom.transform, d3.zoomIdentity);
    requestDraw();
  }

  // ---------- decorations (faint, in open ocean, fade out when zoomed) ----------
  function buildDecorations() {
    deco = [];
    const s = Math.max(0.55, Math.min(1.3, proj.scale() / 190));
    const narrow = W < 640;
    const put = (lon, lat, scale, items) => deco.push({ xy: proj([lon, lat]), scale, items });
    // compass rose (North Pacific)
    const R = 34, items = [];
    items.push({ stroke: new Path2D(`M${R * 0.78},0 A${R * 0.78},${R * 0.78} 0 1 1 ${-R * 0.78},0 A${R * 0.78},${R * 0.78} 0 1 1 ${R * 0.78},0`) });
    let ticks = "";
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2, r1 = R * 0.78, r2 = R * (i % 4 ? 0.84 : 0.9);
      ticks += `M${Math.sin(a) * r1},${-Math.cos(a) * r1} L${Math.sin(a) * r2},${-Math.cos(a) * r2} `;
    }
    items.push({ stroke: new Path2D(ticks) });
    const point = (deg, len, w) => {
      const a = (deg * Math.PI) / 180, px = Math.sin(a) * len, py = -Math.cos(a) * len, qx = Math.cos(a) * w, qy = Math.sin(a) * w;
      items.push({ fill: new Path2D(`M0,0 L${qx},${qy} L${px},${py}Z`) });
      items.push({ paper: new Path2D(`M0,0 L${-qx},${-qy} L${px},${py}Z`) });
    };
    for (const d of [45, 135, 225, 315]) point(d, R * 0.6, R * 0.1);
    for (const d of [0, 90, 180, 270]) point(d, R, R * 0.15);
    items.push({ text: "N", x: 0, y: -R - 6 });
    put(-163, 36, s * (narrow ? 0.7 : 1), items);
    if (narrow) return;
    // sea serpent (South Pacific)
    put(-118, -44, s * 0.9, [
      { stroke: new Path2D("M-46,6 C-42,-14 -26,-22 -20,-8 C-18,-2 -22,4 -28,6 M-46,6 C-50,0 -56,-2 -60,1 M-48,-1 L-55,-6 M-6,6 C-2,-16 14,-16 18,6 M28,6 C31,-10 43,-10 46,6 M56,6 C58,-4 64,-6 70,-12 L74,-16 M70,-12 L77,-10") },
      { fill: new Path2D("M-28.7,-12 a1.3,1.3 0 1 0 2.6,0 a1.3,1.3 0 1 0 -2.6,0") },
      { stroke: new Path2D("M-66,10 h20 M-38,10 h28 M-2,10 h24 M30,10 h20 M56,10 h20 M-56,15 h16 M-10,15 h22 M34,15 h28") },
    ]);
    // sailing ship (South Atlantic)
    put(-24, -30, s * 0.8, [
      { paper: new Path2D("M-30,0 L30,0 L24,9 L-22,9 Z") },
      { stroke: new Path2D("M-30,0 L-36,-5 M-8,0 V-46 M12,0 V-38 M-8,-46 L-4,-49 L-8,-50") },
      { paper: new Path2D("M-20,-42 Q-8,-38 4,-42 L4,-26 Q-8,-22 -20,-26 Z M-18,-22 Q-8,-18 2,-22 L2,-6 Q-8,-2 -18,-6 Z M2,-34 Q12,-30 22,-34 L22,-20 Q12,-16 2,-20 Z M4,-16 Q12,-12 20,-16 L20,-4 Q12,-1 4,-4 Z") },
      { stroke: new Path2D("M-40,14 h18 M-14,14 h30 M22,14 h18 M-30,19 h14 M4,19 h22") },
    ]);
  }

  // ---------- drawing ----------
  let drawQueued = false;
  function requestDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(draw);
  }

  // What colour each country gets right now.
  //   paint.tiers: id -> tier, set during review (all answers shown)
  //   paint.pick / pickTier: the country you picked (ringed; coloured by your result)
  let paint = { tiers: null, pick: null, pickTier: null };
  const tierOrWrong = (t) => (t == null ? theme.wrong : theme.tiers[t]);
  function fillFor(owner) {
    if (owner === "DISPUTED") return theme.disputed;
    if (paint.life?.countries?.includes(owner)) return theme.selected;
    if (paint.tiers) {
      const t = paint.tiers[owner];
      if (t !== undefined) return theme.tiers[t];
      return owner === paint.pick ? theme.wrong : theme.faded;
    }
    if (paint.pick && owner === paint.pick) return tierOrWrong(paint.pickTier);
    if (S.phase === "pick" && S.sel && settings.names && owner === S.sel.id) return theme.selected;
    return theme.land;
  }

  function draw() {
    drawQueued = false;
    if (!proj) return;
    const k = T.k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = theme.sea;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * T.x, dpr * T.y);

    // visible area in base coordinates, for culling
    const vx0 = -T.x / k, vy0 = -T.y / k, vx1 = (W - T.x) / k, vy1 = (H - T.y) / k;
    const visible = (b) => b[1][0] >= vx0 && b[0][0] <= vx1 && b[1][1] >= vy0 && b[0][1] <= vy1;
    const useLo = k < 2.4;
    const set = useLo ? shapes.lo : shapes.hi;

    for (const s of set) {
      if (!visible(s.b)) continue;
      ctx.fillStyle = fillFor(s.owner);
      ctx.fill(s.path);
    }
    // hatching over revealed answers
    if (paint.tiers) {
      const m = new DOMMatrix().scale(1 / (dpr * k));
      for (const s of set) {
        const t = paint.tiers[s.owner];
        if (t === undefined || !visible(s.b)) continue;
        patterns[t].setTransform(m);
        ctx.fillStyle = patterns[t];
        ctx.fill(s.path);
      }
    }
    // ink
    ctx.lineJoin = "round";
    if (settings.borders || paint.tiers) {
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 0.7 / k;
      ctx.globalAlpha = paint.tiers ? 0.6 : 0.9;
      ctx.stroke(useLo ? shapes.loBorders : shapes.hiBorders);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = theme.coast;
    ctx.lineWidth = 0.9 / k;
    ctx.stroke(useLo ? shapes.loCoast : shapes.hiCoast);

    // ring around your picked country
    if (paint.pick) {
      ctx.strokeStyle = theme.wax;
      ctx.lineWidth = 2.4 / k;
      for (const s of shapes.hi) if (s.owner === paint.pick && visible(s.b)) ctx.stroke(s.path);
    }

    // decorations
    const fade = k <= 1.8 ? 1 : Math.max(0, 1 - (k - 1.8) / 1.4);
    if (fade > 0) {
      ctx.globalAlpha = 0.42 * fade;
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      for (const d of deco) {
        ctx.save();
        ctx.translate(d.xy[0], d.xy[1]);
        ctx.scale(d.scale, d.scale);
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = theme.deco;
        for (const it of d.items) {
          if (it.stroke) ctx.stroke(it.stroke);
          if (it.fill) {
            ctx.fillStyle = theme.deco;
            ctx.fill(it.fill);
          }
          if (it.paper) {
            ctx.fillStyle = theme.sea;
            ctx.fill(it.paper);
            ctx.stroke(it.paper);
          }
          if (it.text) {
            ctx.fillStyle = theme.deco;
            ctx.fillText(it.text, it.x, it.y);
          }
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // tiny-country dots
    const r = 4.5 / k;
    ctx.lineWidth = 1.2 / k;
    for (const m of markers) {
      const id = m.c.id;
      let fill = theme.paper;
      if (paint.tiers) fill = paint.tiers[id] !== undefined ? theme.tiers[paint.tiers[id]] : id === paint.pick ? theme.wrong : theme.faded;
      else if (paint.pick === id) fill = tierOrWrong(paint.pickTier);
      else if (S.phase === "pick" && S.sel && S.sel.id === id) fill = theme.wax;
      ctx.beginPath();
      ctx.arc(m.xy[0], m.xy[1], r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = id === paint.pick ? theme.wax : theme.coast;
      ctx.stroke();
    }

    if (paint.life) drawLife(k);

    // other players' pins (multiplayer reveal), with name tags
    if (paint.pins) {
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      for (const pin of paint.pins) {
        const p = proj(pin.lonlat);
        if (!p) continue;
        ctx.setTransform(dpr, 0, 0, dpr, dpr * (p[0] * k + T.x), dpr * (p[1] * k + T.y));
        ctx.fillStyle = pin.color;
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 1.2;
        ctx.fill(PIN);
        ctx.stroke(PIN);
        ctx.beginPath();
        ctx.arc(0, -19, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        const w = ctx.measureText(pin.label).width + 10;
        ctx.fillStyle = theme.paper;
        ctx.strokeStyle = pin.color;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -48, w, 17, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = theme.coast;
        ctx.fillText(pin.label, 0, -35.5);
      }
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * T.x, dpr * T.y);
    }

    // the pin (drawn at screen size)
    if (S.sel && (S.phase === "pick" || S.phase === "verdict" || S.phase === "waiting")) {
      const p = proj(S.sel.lonlat);
      ctx.setTransform(dpr, 0, 0, dpr, dpr * (p[0] * k + T.x), dpr * (p[1] * k + T.y));
      ctx.fillStyle = theme.wax;
      ctx.strokeStyle = theme.waxDark;
      ctx.lineWidth = 1.4;
      ctx.fill(PIN);
      ctx.stroke(PIN);
      ctx.beginPath();
      ctx.arc(0, -19, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
  }
  const PIN = new Path2D("M0,0 C-2,-7 -10,-11 -10,-19 A10,10 0 1 1 10,-19 C10,-11 2,-7 0,0Z");

  // Who lived here?: birth (★) and death (✝) markers joined by a dashed great-circle line.
  function drawLife(k) {
    const L = paint.life;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * T.x, dpr * T.y);
    if (d3.geoDistance(L.born, L.died) > 0.003) {
      const interp = d3.geoInterpolate(L.born, L.died);
      ctx.beginPath();
      let prev = null;
      for (let i = 0; i <= 64; i++) {
        const p = proj(interp(i / 64));
        if (!prev || Math.abs(p[0] - prev[0]) > W / 3) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
        prev = p;
      }
      ctx.setLineDash([7 / k, 6 / k]);
      ctx.strokeStyle = theme.coast;
      ctx.lineWidth = 1.8 / k;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const toScreen = (ll) => {
      const p = proj(ll);
      return [p[0] * k + T.x, p[1] * k + T.y];
    };
    const b = toScreen(L.born), d = toScreen(L.died);
    const close = Math.hypot(b[0] - d[0], b[1] - d[1]) < 44;
    // labels go on the outside so they don't collide
    const bUp = close ? true : b[1] <= d[1];
    lifeMarker(d, theme.coast, theme.paper, "✝", L.diedText, close ? false : !bUp, close ? 10 : 0);
    lifeMarker(b, theme.tiers[0], "#fff", "★", L.bornText, bUp, close ? -10 : 0);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * T.x, dpr * T.y);
  }
  function lifeMarker([x, y], fill, ink, glyph, text, up, dx) {
    ctx.setTransform(dpr, 0, 0, dpr, dpr * (x + dx), dpr * y);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = theme.paper;
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, 0, 0.5);
    ctx.font = "700 13px system-ui, sans-serif";
    const w = ctx.measureText(text).width + 14;
    const ty = up ? -36 : 16;
    ctx.beginPath();
    ctx.roundRect(-w / 2, ty, w, 21, 7);
    ctx.fillStyle = theme.paper;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = fill;
    ctx.stroke();
    ctx.fillStyle = theme.coast;
    ctx.fillText(text, 0, ty + 11);
    ctx.textBaseline = "alphabetic";
  }

  // Zoom so both life markers sit in the clear part of the screen.
  function fitLife() {
    const L = paint.life;
    if (!L || !proj) return;
    const a = proj(L.born), b = proj(L.died);
    const narrow = W < 640;
    const sheet = $("#personSheet");
    const top = narrow ? 140 : 150;
    const bottom = !sheet.hidden ? Math.min(H * (narrow ? 0.62 : 0.55), sheet.offsetHeight + 40) : narrow ? 170 : 150;
    const availW = W - (narrow ? 70 : 220), availH = Math.max(80, H - top - bottom);
    const bw = Math.abs(a[0] - b[0]) + 40, bh = Math.abs(a[1] - b[1]) + 60;
    const kk = Math.max(1, Math.min(8, Math.min(availW / bw, availH / bh)));
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    const t = d3.zoomIdentity.translate(W / 2 - cx * kk, top + availH / 2 - cy * kk).scale(kk);
    d3.select(canvas).transition().duration(500).call(zoom.transform, t);
  }

  // ---------- zoom & hit-testing ----------
  const zoom = d3
    .zoom()
    .scaleExtent([1, 60])
    .clickDistance(6)
    .on("zoom", (ev) => {
      T = ev.transform;
      requestDraw();
    });
  d3.select(canvas).call(zoom).on("dblclick.zoom", null);

  function hitTest(sx, sy) {
    const bx = (sx - T.x) / T.k, by = (sy - T.y) / T.k;
    // tiny-country dots first (generous touch radius)
    let best = null, bestD = 14;
    for (const m of markers) {
      const d = Math.hypot((m.xy[0] - bx) * T.k, (m.xy[1] - by) * T.k);
      if (d < bestD) {
        best = m;
        bestD = d;
      }
    }
    if (best) return { owner: best.c.id, part: null, lonlat: best.lonlat };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const inside = (s) => s.b[0][0] <= bx && bx <= s.b[1][0] && s.b[0][1] <= by && by <= s.b[1][1] && ctx.isPointInPath(s.path, bx, by);
    // disputed areas sit on top of the shapes around them (the map's Morocco includes Western Sahara)
    for (const s of shapes.hi) if (s.owner === "DISPUTED" && inside(s)) return { owner: "DISPUTED", part: s.f.properties.part };
    for (const s of shapes.hi) if (s.owner !== "DISPUTED" && inside(s)) return { owner: s.owner, part: s.f.properties.part || null, lonlat: proj.invert([bx, by]) };
    return null;
  }

  d3.select(canvas).on("click", (ev) => {
    const hit = hitTest(ev.offsetX, ev.offsetY);
    if (S.phase === "review") {
      if (hit && hit.owner !== "DISPUTED") openCountry(hit.owner);
      return;
    }
    if (S.phase !== "pick") return;
    if (!hit) return toast("Your pin needs to land on a country.");
    if (hit.owner === "DISPUTED") return toast(`${hit.part} is disputed. Pick another spot.`);
    S.sel = { id: hit.owner, part: hit.part, lonlat: hit.lonlat };
    renderPick();
    requestDraw();
  });

  function zoomToCountry(id) {
    const parts = shapes.hi.filter((s) => s.owner === id);
    const areaOf = (b) => (b[1][0] - b[0][0]) * (b[1][1] - b[0][1]);
    let b;
    if (parts.length) b = parts.reduce((a, s) => (areaOf(s.b) > areaOf(a.b) ? s : a)).b; // largest piece: France, not French Polynesia
    else {
      const m = markers.find((x) => x.c.id === id);
      if (!m) return;
      b = [[m.xy[0] - 4, m.xy[1] - 4], [m.xy[0] + 4, m.xy[1] + 4]];
    }
    const bw = Math.max(b[1][0] - b[0][0], 6), bh = Math.max(b[1][1] - b[0][1], 6);
    const k = Math.max(1, Math.min(14, 0.4 / Math.max(bw / W, bh / H)));
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    const narrow = W < 640;
    // keep the country clear of the side panel (desktop) or bottom sheet (phone)
    const tx = narrow ? W / 2 : (W - 420) / 2;
    const ty = narrow ? H * 0.22 : H * 0.42;
    const t = d3.zoomIdentity.translate(tx - cx * k, ty - cy * k).scale(k);
    d3.select(canvas).transition().duration(450).call(zoom.transform, t);
  }

  // keyboard: arrows pan, +/- zoom, Enter acts, Esc closes
  document.addEventListener("keydown", (ev) => {
    if (document.querySelector("dialog[open]") || !$("#home").hidden || !$("#camp").hidden || !$("#lobby").hidden || !$("#mpOver").hidden) return;
    if (ev.key === "Escape" && !$("#detail").hidden) return closeDetail();
    const busy = ev.target.closest("button, input, a, summary");
    const step = 60;
    const pan = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[ev.key];
    const sel = d3.select(canvas);
    if (pan && !busy) {
      ev.preventDefault();
      sel.transition().duration(120).call(zoom.translateBy, pan[0] / T.k, pan[1] / T.k);
    } else if ((ev.key === "+" || ev.key === "=") && !busy) sel.transition().duration(150).call(zoom.scaleBy, 1.6);
    else if (ev.key === "-" && !busy) sel.transition().duration(150).call(zoom.scaleBy, 1 / 1.6);
    else if ((ev.key === "Enter" || ev.key === " ") && !busy) {
      ev.preventDefault();
      if (S.phase === "pick" && S.sel) S.mode === "multi" ? mpDrop() : drop();
      else if (S.phase === "verdict") $("#sheetActions .btn.primary")?.click();
      else if (S.phase === "person") $("#personSheet .btn.primary")?.click();
    }
  });
  $("#zoomCtl").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-zoom]");
    if (!b) return;
    const t = d3.select(canvas).transition().duration(220);
    if (b.dataset.zoom === "in") t.call(zoom.scaleBy, 1.8);
    else if (b.dataset.zoom === "out") t.call(zoom.scaleBy, 1 / 1.8);
    else t.call(zoom.transform, d3.zoomIdentity);
  });

  function renderPick() {
    const box = $("#pick");
    box.replaceChildren();
    if (!S.sel) {
      box.append(el("span", "pick-hint", "Tap the map to place your pin"));
      $("#dropBtn").disabled = true;
      return;
    }
    const c = E.BY_ID[S.sel.id];
    if (settings.names) {
      box.append(`${c.flag} ${c.name}`);
      if (S.sel.part) box.append(el("span", "sub", ` · ${S.sel.part}`));
    } else box.append(el("span", "pick-hint", "Pin placed. Tap to move it."));
    $("#dropBtn").disabled = false;
  }

  // =====================================================================
  // Game flow
  // =====================================================================
  // ---------- Today's Avdle: 5 countries, then 3 people, then 3 dates. Same for everyone, new every day. ----------
  const dailyPeopleFor = (key) => P.draw(E.seededRng(`avdle-people-${key}`), 3, new Set(), "rising");
  function dailyYears(key) {
    try {
      return JSON.parse(localStorage.getItem("warpath.daily." + key) || "[]") || [];
    } catch {
      return [];
    }
  }
  function dailyState(key) {
    const prompts = E.dailyPrompts(key);
    const saved = store.get("daily." + key, null);
    const picks = saved?.picks || [];
    // ignore saves from an older version of the prompt list
    const places = picks.every((p, i) => prompts[i] && p.prompt === prompts[i].id) ? picks : [];
    return { prompts, places, people: store.get("dailyPeople." + key, []), years: dailyYears(key) };
  }
  const sumPts = (a) => a.reduce((s, p) => s + ((p && p.points) || 0), 0);
  const dailyTotal = (key) => {
    const st = dailyState(key);
    return sumPts(st.places) + sumPts(st.people) + sumPts(st.years);
  };
  const dailyDone = (st) => st.places.length >= 5 && st.people.length >= 3 && st.years.length >= 3;
  function startDaily() {
    const key = E.localDateKey();
    S.dailyKey = key;
    const st = dailyState(key);
    const go = () => {
      if (st.places.length < 5) return startDailyPlaces(st);
      if (st.people.length < 3) return startDailyPeople(key, st);
      if (st.years.length < 3) return startDailyYears(key);
      showDailyCamp();
    };
    if (!st.places.length && !st.people.length && !st.years.length) showHowTo("daily", go);
    else go();
  }
  function startDailyPlaces(st) {
    S.mode = "daily";
    S.daily = null;
    S.prompts = st.prompts;
    S.picks = st.places.slice();
    S.idx = S.picks.length;
    enterGame();
  }
  async function startDailyPeople(key, st) {
    hideAllPanels();
    if (!P.LIST) toast("Loading famous people…");
    try {
      await loadPeople();
    } catch {
      toast("Couldn't load the famous people list. Check your connection.");
      return showHome();
    }
    S.mode = "people";
    S.daily = key;
    S.peopleInfinite = false;
    S.recorded = true;
    S.people = dailyPeopleFor(key);
    S.picks = st.people.slice();
    S.idx = S.picks.length;
    showPerson();
  }
  function startDailyYears(key) {
    if (!window.WarpathUI) return showDailyCamp();
    showHome();
    window.WarpathUI.open({ daily: { key, number: E.dailyNumber(key), onDone: () => startDaily() } });
  }
  async function showDailyCamp() {
    const key = S.dailyKey || E.localDateKey();
    const st = dailyState(key);
    if (st.people.length && !P.LIST) {
      try {
        await loadPeople();
      } catch {}
    }
    S.mode = "daily";
    S.daily = null;
    S.dailyKey = key;
    S.prompts = st.prompts;
    S.picks = st.places.slice();
    S.idx = S.picks.length;
    stopTimer();
    recordStats();
    S.phase = "idle";
    S.sel = null;
    paint = { tiers: null, pick: null, pickTier: null };
    hideAllPanels();
    $("#zoomCtl").hidden = true;
    $("#runInfo").hidden = true;
    requestDraw();
    const n = E.dailyNumber(key);
    const total = sumPts(st.places) + sumPts(st.people) + sumPts(st.years);
    const WP = window.Warpath;
    const rowP = st.places.map((p) => (p.correct ? TIERS[p.tier].emoji : "⬛")).join("");
    const rowH = st.people.map((p) => (p.correct ? P.TIERS[p.tier].emoji : "⬛")).join("");
    const rowY = st.years.map((r) => (WP ? WP.TIERS[r.tier].emoji : "")).join("");
    $("#campEyebrow").textContent = `Today's Avdle #${n}`;
    $("#campScore").textContent = `${fmt(total)} pts`;
    $("#campEmoji").textContent = `🌍 ${rowP}   👤 ${rowH}   📅 ${rowY}`;
    const actions = $("#campActions");
    actions.replaceChildren();
    const btn = (label, primary, fn) => {
      const b = el("button", "btn" + (primary ? " primary" : ""), label);
      b.addEventListener("click", fn);
      actions.append(b);
    };
    btn("See the country answers on the map", true, () => showReview(0));
    btn("Share", false, async () => {
      const url = /^https?:/.test(location.href) ? `\n${location.origin}${location.pathname}` : "";
      const text = `Today's Avdle #${n} · ${fmt(total)} pts\n🌍 ${rowP}\n👤 ${rowH}\n📅 ${rowY}${url}`;
      try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text });
        else {
          await navigator.clipboard.writeText(text);
          toast("Result copied to clipboard");
        }
      } catch {
        toast("Couldn't share from here.");
      }
    });
    btn("Play Infinite mode", false, chooseInfinite);
    btn("Home", false, showHome);

    const list = $("#campList");
    list.replaceChildren();
    const head = (t) => list.append(el("li", "ans-head", t));
    head(`🌍 Countries · ${fmt(sumPts(st.places))} pts`);
    st.places.forEach((pick, i) => {
      const p = st.prompts[i];
      if (!p) return;
      const li = el("li");
      li.append(el("p", "ans-prompt", p.text));
      const row = el("div", "ans-pick");
      const c = pick.country ? E.BY_ID[pick.country] : null;
      row.append(el("span", null, c ? `${c.flag} ${c.name}` : "No pin"));
      row.append(el("span", pick.correct ? `chip t${pick.tier}` : "chip", pick.correct ? `${TIERS[pick.tier].label} +${fmt(pick.points)}` : "+0"));
      li.append(row);
      const view = el("button", "link-btn", `View all ${p.answers.length} answers on the map →`);
      view.addEventListener("click", () => showReview(i));
      li.append(view);
      list.append(li);
    });
    head(`👤 Famous people · ${fmt(sumPts(st.people))} pts`);
    st.people.forEach((pick) => {
      const person = P.BY_ID && P.BY_ID[pick.person];
      const li = el("li");
      li.append(el("p", "ans-prompt", person ? person.name : "A famous person"));
      const row = el("div", "ans-pick");
      row.append(el("span", null, pick.guess ? `You said: ${pick.guess}` : "No answer"));
      row.append(el("span", pick.correct ? `chip t${pick.tier}` : "chip", pick.correct ? `+${fmt(pick.points)}` : "+0"));
      li.append(row);
      if (person) {
        const view = el("button", "link-btn", "See where they lived and died →");
        view.addEventListener("click", () => showPersonReveal(person, pick, "Back to results", showDailyCamp));
        li.append(view);
      }
      list.append(li);
    });
    head(`📅 Dates · ${fmt(sumPts(st.years))} pts`);
    st.years.forEach((r) => {
      const ev = WP && WP.LIST[r.event];
      const li = el("li");
      li.append(el("p", "ans-prompt", ev ? ev.text : "A moment in history"));
      const row = el("div", "ans-pick");
      row.append(el("span", null, ev ? `${WP.yearText(ev.y)} · you said ${r.guess != null ? WP.yearText(r.guess) : "nothing"}` : ""));
      row.append(el("span", "chip", `+${fmt(r.points)}`));
      li.append(row);
      list.append(li);
    });
    $("#camp").hidden = false;
    $("#camp").scrollTop = 0;
    startCountdown();
  }
  function startUnlimited() {
    S.mode = "unlimited";
    S.recorded = false;
    S.runNo = stats.unlimited.runs + 1;
    S.prompts = E.drawPrompts(Math.random, 5, new Set(store.get("seen", [])));
    S.picks = [];
    S.idx = 0;
    enterGame();
  }
  // Infinite: one prompt at a time, every answer shown straight away, and it never ends.
  function startInfinite() {
    S.mode = "infinite";
    S.prompts = E.drawPrompts(Math.random, 1, new Set(store.get("seen", [])));
    S.picks = [];
    S.idx = 0;
    enterGame();
  }
  function nextInfinite() {
    const seen = new Set([...store.get("seen", []), ...S.prompts.map((p) => p.id)]);
    S.prompts.push(E.drawPrompts(Math.random, 1, seen)[0]);
    S.idx = S.prompts.length - 1;
    showPrompt();
  }
  function startPractice() {
    S.mode = "practice";
    S.prompts = E.drawPrompts(Math.random, 1, new Set(store.get("seen", [])));
    S.picks = [];
    S.idx = 0;
    enterGame();
  }

  function hideAllPanels() {
    for (const id of ["#promptCard", "#dock", "#sheet", "#review", "#detail", "#home", "#camp", "#mpBoard", "#lobby", "#mpOver", "#guessDock", "#yearDock", "#personSheet", "#promptHint"]) {
      const n = $(id);
      if (n) n.hidden = true;
    }
    $("#dropBtn").hidden = false;
    document.querySelector("#dock .skip-btn")?.remove();
    $("#exitBtn").hidden = false; // every screen but home has a way out
    if (!S.keepDots) dotWorld(false); // leaving a Dates question: the dots fly away and the normal map comes back
  }
  // The dot-matrix world behind Dates questions (drawn by Warpath).
  function dotWorld(on, clue) {
    const UI = window.WarpathUI;
    if (!UI || !UI.backdropShow) return;
    if (!on) return UI.backdropHide();
    S.dotN = (S.dotN || 0) + 1;
    return UI.backdropShow({ clue, index: S.dotN, area: dotArea });
  }
  function dotArea() {
    const card = $("#promptCard");
    const dock = !$("#yearDock").hidden ? $("#yearDock") : !$("#sheet").hidden ? $("#sheet") : null;
    const top = card && !card.hidden ? card.getBoundingClientRect().bottom + 4 : $("#topbar").getBoundingClientRect().bottom;
    const bottom = dock ? dock.getBoundingClientRect().top - 4 : window.innerHeight;
    return { top, bottom };
  }
  function enterGame() {
    hideAllPanels();
    $("#runInfo").hidden = false;
    $("#zoomCtl").hidden = false;
    showPrompt();
  }

  function modeLabel() {
    if (S.mode === "multi") return `Room ${MP.room ? MP.room.code : ""}`;
    if (S.mode === "mix") return `∞ Mix · ${(S.mixLog || []).length} answered`;
    if (S.mode === "daily") return `Today's Avdle #${E.dailyNumber(S.dailyKey)} · countries`;
    if (S.mode === "people" && S.daily) return `Today's Avdle #${E.dailyNumber(S.daily)} · people`;
    if (S.mode === "people" && S.peopleInfinite) return `∞ Who lived here? · ${S.picks.length} answered`;
    if (S.mode === "unlimited") return `Infinite · expedition ${S.runNo}`;
    if (S.mode === "infinite") return `∞ Infinite · ${S.picks.length} answered`;
    if (S.mode === "people") return `Who lived here? · ${{ veryeasy: "very easy", easy: "easy", medium: "medium", hard: "hard", rising: "rising" }[store.get("peopleLevel", "rising")]} · game ${S.runNo}`;
    return "Practice";
  }
  const runScore = () => (S.mode === "mix" ? (S.mixLog || []).reduce((s, x) => s + x.points, 0) : S.picks.reduce((s, p) => s + p.points, 0));
  const updateScore = () =>
    ($("#scoreLabel").textContent = S.mode === "practice" ? "" : `${fmt(S.mode === "multi" ? mpMyScore() : runScore())} pts`);

  function showPrompt() {
    const p = S.prompts[S.idx];
    S.sel = null;
    S.phase = "pick";
    paint = { tiers: null, pick: null, pickTier: null };
    $("#modeLabel").textContent = modeLabel();
    updateScore();
    $("#promptCount").textContent = S.mode === "practice" ? "Practice" : S.mode === "infinite" ? `∞ Prompt ${S.idx + 1}` : `Prompt ${S.idx + 1} of ${S.prompts.length}`;
    $("#promptFamily").textContent = E.FAMILY_LABEL[p.family] || "";
    $("#promptText").textContent = p.text;
    $("#promptNote").textContent = p.note;
    hideAllPanels();
    $("#runInfo").hidden = false;
    $("#zoomCtl").hidden = false;
    $("#promptCard").hidden = false;
    $("#dock").hidden = false;
    renderPick();
    startTimer();
    markSeen(p.id);
    d3.select(canvas).transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    requestDraw();
  }

  function markSeen(id) {
    const seen = store.get("seen", []);
    if (!seen.includes(id)) seen.push(id);
    store.set("seen", seen.slice(-500));
  }

  let timerId = null;
  function startTimer() {
    stopTimer();
    const t = $("#timer");
    if (!settings.timer || S.mode === "practice") {
      t.hidden = true;
      return;
    }
    S.deadline = Date.now() + 60000;
    t.hidden = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((S.deadline - Date.now()) / 1000));
      t.textContent = `0:${String(left).padStart(2, "0")}`;
      t.classList.toggle("low", left <= 10);
      if (left === 0) {
        stopTimer();
        drop(true);
      }
    };
    tick();
    timerId = setInterval(tick, 250);
  }
  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
  }

  function drop(timedOut = false) {
    if (S.phase !== "pick") return;
    stopTimer();
    const p = S.prompts[S.idx];
    const res = S.sel ? E.judge(p, S.sel.id) : { correct: false, tier: null, points: 0 };
    const pick = { prompt: p.id, country: S.sel?.id ?? null, ...res, timedOut: timedOut && !S.sel };
    $("#dock").hidden = true;
    if (S.mode === "practice") {
      S.picks = [pick];
      return showReview(0); // practice shows every answer straight away
    }
    if (S.mode === "infinite" || S.mode === "mix") {
      S.picks[S.idx] = pick;
      if (S.mode === "mix") S.mixLog.push({ kind: "places", id: p.id, points: pick.points });
      return showReview(S.idx); // infinite also shows every answer straight away
    }
    S.picks.push(pick);
    if (S.mode === "daily") store.set("daily." + S.dailyKey, { picks: S.picks });
    S.phase = "verdict";
    paint = { tiers: null, pick: pick.country, pickTier: pick.tier };
    updateScore();
    showVerdict(p, pick);
    requestDraw();
  }

  // After each pick: only your verdict. The full answer map comes at the end of the run.
  function showVerdict(p, pick) {
    const chip = $("#verdictChip");
    const c = pick.country ? E.BY_ID[pick.country] : null;
    if (pick.correct) {
      chip.className = `chip t${pick.tier}`;
      chip.textContent = TIERS[pick.tier].label;
      $("#verdictPoints").textContent = `+${fmt(pick.points)}`;
    } else {
      chip.className = "chip";
      chip.textContent = pick.timedOut ? "Out of time" : "Off the map";
      $("#verdictPoints").textContent = "+0";
    }
    $("#verdictTitle").textContent = c ? `${c.flag} ${c.name}` : "No pin dropped";
    $("#verdictWhy").textContent = c ? E.explain(p, c.id).text : `${p.answers.length} countries would have counted. You'll see them all at the end.`;

    const actions = $("#sheetActions");
    actions.replaceChildren();
    const btn = (label, primary, fn) => {
      const b = el("button", "btn" + (primary ? " primary" : ""), label);
      b.addEventListener("click", fn);
      actions.append(b);
      return b;
    };
    if (c) btn(`About ${c.name}`, false, () => openCountry(c.id, p));
    const last = S.idx === S.prompts.length - 1;
    btn(last ? (S.mode === "daily" ? "Next: famous people ▶" : "See results") : "Next prompt", true, () => {
      S.idx++;
      if (S.idx >= S.prompts.length) S.mode === "daily" ? startDaily() : showCamp();
      else showPrompt();
    });
    $("#sheet").hidden = false;
    actions.querySelector(".btn.primary").focus({ preventScroll: true });
  }

  // =====================================================================
  // Review: every answer for a prompt, painted on the map
  // =====================================================================
  const promptAt = (i) => S.prompts[i] || E.BY_PROMPT[S.picks[i].prompt];

  function showReview(i) {
    if (S.mode !== "multi") S.reviewRounds = null;
    S.reviewIdx = i;
    S.phase = "review";
    const pick = S.picks[i];
    const p = promptAt(i);
    hideAllPanels();
    $("#runInfo").hidden = false;
    $("#zoomCtl").hidden = false;
    $("#modeLabel").textContent = modeLabel();
    updateScore();
    paint = { tiers: p.tiers, pick: pick.country, pickTier: pick.tier };
    if (S.mode === "multi") {
      paint.pins = mpPinsForRound(i);
    }

    const practice = S.mode === "practice";
    const infinite = S.mode === "infinite" || S.mode === "mix";
    $("#revCount").textContent = practice ? "Practice" : S.mode === "mix" ? `∞ Question ${S.mixLog.length} · ${fmt(runScore())} pts` : infinite ? `∞ Prompt ${i + 1} · ${fmt(runScore())} pts` : `Answers ${i + 1} of ${S.picks.length}`;
    $("#revPrev").hidden = $("#revNext").hidden = practice || infinite;
    $("#revPrev").disabled = i === 0;
    $("#revNext").disabled = i >= S.picks.length - 1;
    $("#revPrompt").textContent = p.text;

    const pickBox = $("#revPick");
    pickBox.replaceChildren();
    if (pick.country) {
      const c = E.BY_ID[pick.country];
      pickBox.append(el("span", null, "Your pin:"));
      const b = el("button", "link-btn", `${c.flag} ${c.name}`);
      b.addEventListener("click", () => openCountry(c.id));
      pickBox.append(b);
      pickBox.append(el("span", pick.correct ? `chip t${pick.tier}` : "chip", pick.correct ? `${TIERS[pick.tier].label} +${fmt(pick.points)}` : "Off the map +0"));
    } else pickBox.append(el("span", null, pick.timedOut ? "Out of time: no pin." : "No pin dropped."));

    const legend = $("#revLegend");
    legend.replaceChildren();
    const groups = E.answersByTier(p);
    legend.append(el("span", null, `${p.answers.length} answers:`));
    TIERS.forEach((t, ti) => {
      if (!groups[ti].length) return;
      const s = el("span");
      s.append(el("i", `dot-t${ti}`), `${t.label} ${groups[ti].length}`);
      legend.append(s);
    });

    const chips = $("#revAnswers");
    chips.replaceChildren();
    // rarest first: that's where the learning is
    for (let ti = TIERS.length - 1; ti >= 0; ti--) {
      if (!groups[ti].length) continue;
      const row = el("div", "tier-row");
      row.append(el("b", `t${ti}`, `${TIERS[ti].label} · ${fmt(TIERS[ti].points)}`));
      for (const id of groups[ti]) {
        const c = E.BY_ID[id];
        const b = el("button", "ans-chip" + (id === pick.country ? " mine" : ""));
        b.append(el("i", `dot-t${ti}`), `${c.flag} ${c.name}`);
        b.addEventListener("click", () => openCountry(id));
        row.append(b);
      }
      chips.append(row);
    }

    const topic = $("#revTopic");
    topic.hidden = !p.topic;
    if (p.topic) {
      topic.textContent = `Learn more: ${p.topic} →`;
      topic.onclick = () => openTopic(p.topic);
    }

    const actions = $("#revActions");
    actions.replaceChildren();
    const btn = (label, primary, fn) => {
      const b = el("button", "btn" + (primary ? " primary" : ""), label);
      b.addEventListener("click", fn);
      actions.append(b);
    };
    if (practice) {
      btn("Try again", false, () => {
        S.picks = [];
        showPrompt();
      });
      btn("New prompt", true, startPractice);
    } else if (infinite) {
      btn("Stop", false, showHome);
      btn(S.mode === "mix" ? "Next question" : "Next prompt", true, S.mode === "mix" ? nextMix : nextInfinite);
    } else if (S.mode === "multi") btn("Standings", true, mpOver);
    else btn("Results", true, S.mode === "daily" ? showDailyCamp : showCamp);

    $("#review").hidden = false;
    $("#review").scrollTop = 0;
    d3.select(canvas).transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    requestDraw();
  }
  $("#revPrev").addEventListener("click", () => S.reviewIdx > 0 && showReview(S.reviewIdx - 1));
  $("#revNext").addEventListener("click", () => S.reviewIdx < S.picks.length - 1 && showReview(S.reviewIdx + 1));

  // =====================================================================
  // Learn more: country or topic panel
  // =====================================================================
  const wikiCache = new Map();
  function wikiSummary(title) {
    if (wikiCache.has(title)) return wikiCache.get(title);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    const job = fetch(url, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    wikiCache.set(title, job);
    return job;
  }
  function renderWiki(box, title) {
    box.replaceChildren(el("p", "small", "Loading from Wikipedia…"));
    wikiSummary(title).then((w) => {
      box.replaceChildren();
      if (!w || !w.extract) {
        box.append(el("p", "small", "Couldn't reach Wikipedia right now."));
        return;
      }
      if (w.thumbnail?.source) {
        const img = el("img");
        img.src = w.thumbnail.source;
        img.alt = "";
        img.loading = "lazy";
        box.append(img);
      }
      box.append(el("p", null, w.extract));
      const a = el("a", null, "Read the full article on Wikipedia →");
      a.href = w.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
      a.target = "_blank";
      a.rel = "noopener";
      box.append(a);
    });
  }

  function openCountry(id, promptOverride) {
    const prompt = promptOverride || (S.phase === "review" ? promptAt(S.reviewIdx) : null);
    const prof = E.profile(id);
    const c = prof.country;
    const body = $("#detailBody");
    body.replaceChildren();
    body.append(el("h3", null, `${c.flag} ${c.name}`));

    if (prompt) {
      const ex = E.explain(prompt, id);
      const why = el("div", "why " + (ex.correct ? "yes" : "no"));
      const head = el("p");
      head.style.margin = "0 0 6px";
      head.append(el("span", ex.correct ? `chip t${ex.tier}` : "chip", ex.correct ? `${TIERS[ex.tier].label} · ${fmt(TIERS[ex.tier].points)} pts` : "Not an answer"));
      const text = el("p", null, ex.text);
      text.style.margin = "0";
      why.append(head, text);
      body.append(why);
      if (prompt.source) body.append(el("p", "small", `Source: ${prompt.source}`));
    }

    body.append(el("h4", null, "Facts"));
    const dl = el("dl", "facts");
    for (const [k, v] of prof.rows) dl.append(el("dt", null, k), el("dd", null, v));
    body.append(dl);

    if (prof.trivia.length) {
      body.append(el("h4", null, "Did you know"));
      const ul = el("ul", "trivia");
      for (const t of prof.trivia.slice(0, 10)) ul.append(el("li", null, t.text));
      body.append(ul);
    }

    body.append(el("h4", null, `About ${c.name}`));
    const wiki = el("div", "wiki");
    body.append(wiki);
    renderWiki(wiki, prof.wiki);

    $("#detail").hidden = false;
    $("#detail").scrollTop = 0;
    if (S.phase === "review") zoomToCountry(id);
  }

  function openTopic(title) {
    const body = $("#detailBody");
    body.replaceChildren(el("h3", null, title));
    const wiki = el("div", "wiki");
    body.append(wiki);
    renderWiki(wiki, title);
    $("#detail").hidden = false;
    $("#detail").scrollTop = 0;
  }
  function closeDetail() {
    $("#detail").hidden = true;
  }
  $("#detailClose").addEventListener("click", closeDetail);

  // =====================================================================
  // Results
  // =====================================================================
  function recordStats() {
    const total = S.mode === "daily" ? dailyTotal(S.dailyKey) : runScore();
    if (S.mode === "daily") {
      const saved = store.get("daily." + S.dailyKey, {});
      if (saved.recorded) return;
      const d = stats.daily;
      const prev = d.lastKey ? E.dailyNumber(d.lastKey) : null;
      const now = E.dailyNumber(S.dailyKey);
      d.streak = prev === now - 1 ? d.streak + 1 : 1;
      d.maxStreak = Math.max(d.maxStreak, d.streak);
      d.played++;
      d.best = Math.max(d.best, total);
      d.lastKey = S.dailyKey;
      store.set("daily." + S.dailyKey, { ...saved, picks: S.picks, recorded: true });
    } else if (S.mode === "unlimited" && !S.recorded) {
      S.recorded = true;
      stats.unlimited.runs++;
      stats.unlimited.best = Math.max(stats.unlimited.best, total);
    }
    store.set("stats", stats);
  }

  function shareText() {
    const row = S.picks.map((p) => (p.correct ? TIERS[p.tier].emoji : "⬛")).join("");
    const head = S.mode === "daily" ? `Avdle Daily #${E.dailyNumber(S.dailyKey)}` : "Avdle Infinite";
    const url = /^https?:/.test(location.href) ? `\n${location.origin}${location.pathname}` : "";
    return `${head} · ${fmt(runScore())} pts\n${row}${url}`;
  }

  function showCamp() {
    stopTimer();
    recordStats();
    S.phase = "idle";
    S.sel = null;
    paint = { tiers: null, pick: null, pickTier: null };
    hideAllPanels();
    $("#zoomCtl").hidden = true;
    $("#runInfo").hidden = true;
    requestDraw();

    $("#campEyebrow").textContent = S.mode === "daily" ? `Daily #${E.dailyNumber(S.dailyKey)} · expedition logged` : `Infinite · expedition ${S.runNo}`;
    $("#campScore").textContent = `${fmt(runScore())} pts`;
    $("#campEmoji").textContent = S.picks.map((p) => (p.correct ? TIERS[p.tier].emoji : "⬛")).join(" ");

    const actions = $("#campActions");
    actions.replaceChildren();
    const btn = (label, primary, fn) => {
      const b = el("button", "btn" + (primary ? " primary" : ""), label);
      b.addEventListener("click", fn);
      actions.append(b);
    };
    btn("See all answers on the map", true, () => showReview(0));
    btn("Share", false, async () => {
      const text = shareText();
      try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text });
        else {
          await navigator.clipboard.writeText(text);
          toast("Result copied to clipboard");
        }
      } catch {
        toast("Couldn't share from here.");
      }
    });
    btn(S.mode === "unlimited" ? "Next expedition" : "Play Infinite mode", false, startUnlimited);
    btn("Home", false, showHome);

    const list = $("#campList");
    list.replaceChildren();
    S.picks.forEach((pick, i) => {
      const p = promptAt(i);
      if (!p) return;
      const li = el("li");
      li.append(el("p", "ans-prompt", p.text));
      const row = el("div", "ans-pick");
      const c = pick.country ? E.BY_ID[pick.country] : null;
      row.append(el("span", null, c ? `${c.flag} ${c.name}` : "No pin"));
      row.append(el("span", pick.correct ? `chip t${pick.tier}` : "chip", pick.correct ? `${TIERS[pick.tier].label} +${fmt(pick.points)}` : "+0"));
      li.append(row);
      if (c) li.append(el("p", "ans-why", E.explain(p, c.id).text));
      const view = el("button", "link-btn", `View all ${p.answers.length} answers on the map →`);
      view.addEventListener("click", () => showReview(i));
      li.append(view);
      list.append(li);
    });
    $("#camp").hidden = false;
    $("#camp").scrollTop = 0;
    startCountdown();
  }

  let cdId = null;
  function startCountdown() {
    clearInterval(cdId);
    const out = $("#countdown");
    if (S.mode !== "daily") {
      out.textContent = "";
      return;
    }
    const tick = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const s = Math.max(0, Math.floor((next - now) / 1000));
      const pad = (n) => String(n).padStart(2, "0");
      out.textContent = `Next Avdle in ${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    };
    tick();
    cdId = setInterval(tick, 1000);
  }

  // =====================================================================
  // Home
  // =====================================================================
  function showHome() {
    if (MP.creds) mpLeave(true);
    stopTimer();
    clearInterval(cdId);
    S.phase = "idle";
    S.sel = null;
    paint = { tiers: null, pick: null, pickTier: null };
    hideAllPanels();
    $("#zoomCtl").hidden = true;
    $("#runInfo").hidden = true;
    requestDraw();

    const key = E.localDateKey();
    const today = E.dailyPrompts(key).map((p) => p.id);
    const saved = store.get("daily." + key, null);
    const valid = saved?.picks?.length && saved.picks.every((p, i) => p.prompt === today[i]);
    const n = valid ? saved.picks.length : 0;
    $("#dailyNum").textContent = `#${E.dailyNumber(key)}`;
    const dst = dailyState(key);
    const dn = dst.places.length + dst.people.length + dst.years.length;
    if (dailyDone(dst)) $("#dailyDesc").textContent = `Done: ${fmt(dailyTotal(key))} pts. Tap to see your results.`;
    else if (dn > 0) $("#dailyDesc").textContent = `In progress: ${dn} of 11 answered. Tap to resume.`;
    else $("#dailyDesc").textContent = "5 countries, 3 people and 3 dates. Same for everyone, new every day.";

    const fams = [...new Set(Object.keys(E.FAMILIES).map((f) => E.FAMILY_LABEL[f]))];
    $("#topics").textContent = `${fmt(E.POOL.length)} prompts across ${fams.join(", ").toLowerCase()}, plus over 3,000 famous people.`;

    const row = $("#statsRow");
    row.replaceChildren();
    if (stats.daily.played || stats.unlimited.runs) {
      for (const [v, l] of [[stats.daily.played, "Dailies played"], [stats.daily.streak, "Streak"], [fmt(stats.daily.best), "Best daily"], [fmt(stats.unlimited.best), "Best run"]]) {
        const s = el("div", "stat");
        s.append(el("strong", null, String(v)), el("span", null, l));
        row.append(s);
      }
    }
    $("#home").hidden = false;
    $("#exitBtn").hidden = true;
    $("#home").scrollTop = 0;
  }

  // =====================================================================
  // Multiplayer: rooms on the Longshot server (server/server.js)
  // The server draws the prompts, runs the clock and scores every pick.
  // =====================================================================
  const canMulti = /^https?:$/.test(location.protocol);
  const PLAYER_COLORS = ["#c0392b", "#2563eb", "#16a34a", "#7c3aed", "#0d9488", "#db2777", "#475569", "#9a3412"];
  const MP = { ws: null, room: null, me: null, creds: null, shown: null, retry: null, pendingOpen: null };
  const CRED_KEY = "longshot.mp";
  function mpLoadCreds() {
    try {
      return JSON.parse(sessionStorage.getItem(CRED_KEY));
    } catch {
      return null;
    }
  }
  function mpSaveCreds(c) {
    try {
      if (c) sessionStorage.setItem(CRED_KEY, JSON.stringify(c));
      else sessionStorage.removeItem(CRED_KEY);
    } catch {}
  }
  const mpPlayers = () => (MP.room ? MP.room.players : []);
  const mpColor = (id) => PLAYER_COLORS[Math.max(0, mpPlayers().findIndex((p) => p.id === id)) % PLAYER_COLORS.length];
  const mpMe = () => mpPlayers().find((p) => p.id === MP.me);
  function mpMyScore() {
    return mpMe()?.score || 0;
  }
  const mpSend = (m) => {
    if (MP.ws && MP.ws.readyState === 1) MP.ws.send(JSON.stringify(m));
  };

  function mpConnect(onOpen) {
    if (MP.ws && MP.ws.readyState === 1) return onOpen?.();
    if (MP.ws && MP.ws.readyState === 0) return void (MP.pendingOpen = onOpen);
    const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
    MP.ws = ws;
    MP.pendingOpen = onOpen;
    ws.onopen = () => {
      $("#mpStatus").textContent = "";
      const f = MP.pendingOpen;
      MP.pendingOpen = null;
      f?.();
    };
    ws.onmessage = (ev) => {
      let m;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      mpMessage(m);
    };
    ws.onclose = () => {
      if (MP.ws !== ws) return;
      MP.ws = null;
      if (!MP.creds) {
        $("#mpStatus").textContent = "Couldn't reach the server.";
        return;
      }
      $("#mpStatus").textContent = "Connection lost. Reconnecting…";
      toast("Connection lost. Reconnecting…");
      clearTimeout(MP.retry);
      MP.retry = setTimeout(() => MP.creds && mpConnect(() => mpSend({ t: "rejoin", ...MP.creds })), 1500);
    };
  }

  function mpMessage(m) {
    if (m.t === "error") {
      $("#mpStatus").textContent = m.msg;
      toast(m.msg);
    } else if (m.t === "joined") {
      MP.creds = { code: m.code, id: m.id, token: m.token };
      mpSaveCreds(MP.creds);
      history.replaceState(null, "", `?room=${m.code}`);
    } else if (m.t === "gone") {
      MP.creds = null;
      MP.room = null;
      mpSaveCreds(null);
      history.replaceState(null, "", location.pathname);
      toast("That room has closed.");
      showLobby();
    } else if (m.t === "hint") {
      if (MP.room && m.round === MP.room.round) showHintText(m.text);
    } else if (m.t === "result" && m.kind === "people") {
      mpPersonResult(m);
    } else if (m.t === "result" && m.kind === "year") {
      mpYearResult(m);
    } else if (m.t === "result") {
      const c = m.country ? E.BY_ID[m.country] : null;
      toast(c ? `${c.flag} ${c.name}: ${m.correct ? `${TIERS[m.tier].label} +${fmt(m.points)}` : "not an answer, +0"}` : "No pin: +0");
    } else if (m.t === "room") {
      MP.room = m;
      MP.me = m.you;
      mpRender();
    }
  }

  function mpRender() {
    const r = MP.room;
    S.mode = "multi";
    if (r.state === "lobby") {
      MP.shown = null;
      return showLobbyRoom();
    }
    if ((r.kind === "people" || r.items?.some((x) => x.kind === "people")) && !P.LIST) {
      loadPeople().then(mpRender, () => toast("Couldn't load the famous people list. Check your connection."));
      return;
    }
    // a person's reveal stays up until you press Next, even if the room has moved on
    if (MP.hold) return mpBoard();
    const key = `${r.state}:${r.round}`;
    if (MP.shown !== key) {
      MP.shown = key;
      if (r.state === "round") mpRound();
      else mpOver();
    } else if (r.state === "over" && !$("#mpOver").hidden) mpOver();
    mpBoard();
  }

  // ---------- lobby ----------
  function showLobby(code) {
    S.mode = "multi";
    S.phase = "idle";
    hideAllPanels();
    $("#runInfo").hidden = true;
    $("#zoomCtl").hidden = true;
    $("#lobby").hidden = false;
    if (MP.room && MP.room.state === "lobby") return showLobbyRoom();
    $("#lobbyJoin").hidden = false;
    $("#lobbyRoom").hidden = true;
    $("#mpBack").hidden = false;
    $("#mpOffline").hidden = canMulti;
    $("#mpCreate").disabled = $("#mpJoin").disabled = !canMulti;
    $("#mpName").value = store.get("name", "");
    const drawCreate = () =>
      renderRoomSettings($("#createSettings"), roomDefaults(), true, (st) => {
        store.set("roomSettings", st);
        drawCreate();
      });
    drawCreate();
    if (code) $("#mpCode").value = String(code).toUpperCase().slice(0, 4);
    ($("#mpName").value ? $("#mpCode").value ? $("#mpJoin") : $("#mpCreate") : $("#mpName")).focus();
  }

  function showLobbyRoom() {
    const r = MP.room;
    hideAllPanels();
    $("#runInfo").hidden = true;
    $("#zoomCtl").hidden = true;
    $("#lobby").hidden = false;
    $("#lobbyJoin").hidden = true;
    $("#lobbyRoom").hidden = false;
    $("#mpBack").hidden = true;
    $("#mpRoomCode").textContent = r.code;
    const ul = $("#mpPlayers");
    ul.replaceChildren();
    for (const p of r.players) {
      const li = el("li", p.connected ? "" : "off");
      const sw = el("span", "swatch");
      sw.style.background = mpColor(p.id);
      li.append(sw, el("span", null, p.name + (p.id === MP.me ? " (you)" : "")));
      const tags = [p.id === r.host ? "host" : "", p.connected ? "" : "offline"].filter(Boolean).join(" · ");
      if (tags) li.append(el("span", "tag", tags));
      ul.append(li);
    }
    const isHost = r.host === MP.me;
    renderRoomSettings($("#roomSettings"), r.settings, isHost, (st) => {
      store.set("roomSettings", st);
      mpSend({ t: "settings", settings: st });
    });
    if ((r.settings.cats || []).includes("people")) loadPeople().catch(() => {});
    $("#mpStart").hidden = !isHost;
    $("#mpWaitHost").hidden = isHost;
    $("#mpStart").textContent = r.players.length < 2 ? "Start (waiting for friends? you can play solo)" : `Start game · ${r.players.length} players`;
  }

  function mpName() {
    const n = $("#mpName").value.trim().slice(0, 20) || "Explorer";
    store.set("name", n);
    return n;
  }
  $("#mpCreate").addEventListener("click", () => {
    const name = mpName();
    $("#mpStatus").textContent = "Creating room…";
    mpConnect(() => mpSend({ t: "create", name, settings: roomDefaults() }));
  });
  $("#mpJoin").addEventListener("click", () => {
    const code = $("#mpCode").value.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return toast("Room codes are 4 letters.");
    const name = mpName();
    $("#mpStatus").textContent = "Joining…";
    mpConnect(() => mpSend({ t: "join", code, name }));
  });
  $("#mpCode").addEventListener("keydown", (ev) => ev.key === "Enter" && $("#mpJoin").click());
  $("#mpName").addEventListener("keydown", (ev) => ev.key === "Enter" && ($("#mpCode").value ? $("#mpJoin") : $("#mpCreate")).click());
  $("#mpStart").addEventListener("click", () => mpSend({ t: "start" }));
  // Room rules: what kind of questions, how famous the people are, and the clock.
  const ROOM_DEFAULTS = { rounds: 5, cats: ["places"], level: "rising", yearLevel: 2, timer: 0 };
  const LEGACY_MODE = { places: 0, people: 100, mix: 50 };
  const roomDefaults = () => {
    const saved = store.get("roomSettings", {});
    const st = { ...ROOM_DEFAULTS, ...saved };
    if (!Array.isArray(saved.cats)) {
      const pct = saved.people != null ? saved.people : saved.mode in LEGACY_MODE ? LEGACY_MODE[saved.mode] : 0;
      st.cats = pct <= 0 ? ["places"] : pct >= 100 ? ["people"] : ["places", "people"];
    }
    delete st.mode;
    delete st.people;
    return st;
  };
  const ROUNDS_OPTS = [3, 5, 8, 10, 15, 20].map((n) => [n, String(n)]);
  const LEVEL_OPTS = [
    ["rising", "Rising", "Starts easy, ends hard"],
    ["veryeasy", "Very easy", "Only the most famous"],
    ["easy", "Easy", "Household names"],
    ["medium", "Medium", "Famous, but think"],
    ["hard", "Hard", "Deep cuts for experts"],
  ];
  const TIMER_OPTS = [0, 20, 30, 45, 60, 90].map((t) => [t, t ? `${t} s` : "No clock"]);
  function renderRoomSettings(box, st, editable, onChange) {
    box.replaceChildren();
    const group = (title, opts, key, wide) => {
      const g = el("div", "set-group");
      g.append(el("p", "set-label", title));
      const seg = el("div", "seg" + (wide ? " seg-wide" : ""));
      for (const [v, label, desc] of opts) {
        const b = el("button", "seg-btn" + (st[key] === v ? " on" : ""));
        b.type = "button";
        b.setAttribute("aria-pressed", String(st[key] === v));
        b.append(el("span", "seg-name", label));
        if (desc) b.append(el("span", "seg-desc", desc));
        b.disabled = !editable;
        b.addEventListener("click", () => editable && st[key] !== v && onChange({ ...st, [key]: v }));
        seg.append(b);
      }
      g.append(seg);
      box.append(g);
    };
    const cats = Array.isArray(st.cats) && st.cats.length ? st.cats : ["places"];
    // 1. what to play: one kind, or tick several for a random mix
    const g = el("div", "set-group");
    g.append(el("p", "set-label", cats.length > 1 ? `What to play · a random mix of ${cats.length}` : "What to play · tick more than one for a random mix"));
    g.append(catPicker(cats, editable, (next) => onChange({ ...st, cats: next })));
    box.append(g);
    group("Number of questions", ROUNDS_OPTS, "rounds");
    if (cats.includes("people")) group("How famous are the people?", LEVEL_OPTS, "level", true);
    if (cats.includes("years")) group("How hard are the dates?", YEAR_LEVEL_OPTS, "yearLevel", true);
    group("Time per question", TIMER_OPTS, "timer");
    if (!editable) box.append(el("p", "small center", "The host sets the rules."));
  }

  // The room clock. Just before it runs out, whatever you've picked or typed is sent.
  function mpStartTimer(r) {
    stopTimer();
    const t = $("#timer");
    if (r.timeLeft == null) {
      t.hidden = true;
      return;
    }
    S.deadline = Date.now() + r.timeLeft;
    t.hidden = false;
    let sent = false;
    const tick = () => {
      const ms = S.deadline - Date.now();
      const left = Math.max(0, Math.ceil(ms / 1000));
      t.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
      t.classList.toggle("low", left <= 5);
      if (ms <= 700 && !sent) {
        sent = true;
        if (S.phase === "pick") {
          if (S.sel) mpDrop();
          else {
            S.phase = "waiting";
            mpWaiting();
          }
        } else if (S.phase === "guess") submitGuess($("#guessInput").value);
        else if (S.phase === "year") $("#yearForm").requestSubmit();
      }
      if (ms <= 0) stopTimer();
    };
    tick();
    timerId = setInterval(tick, 200);
  }
  $("#mpCopy").addEventListener("click", async () => {
    const link = `${location.origin}${location.pathname}?room=${MP.room.code}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text: `Play Avdle with me! Room ${MP.room.code}`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        toast("Invite link copied");
      }
    } catch {
      toast(`Share this link: ${link}`);
    }
  });
  $("#mpLeave").addEventListener("click", () => {
    mpLeave(false);
    showHome();
  });
  $("#mpBack").addEventListener("click", showHome);

  function mpLeave(silent) {
    mpSend({ t: "leave" });
    MP.creds = null;
    MP.room = null;
    MP.shown = null;
    MP.hold = false;
    mpSaveCreds(null);
    clearTimeout(MP.retry);
    if (MP.ws) {
      const ws = MP.ws;
      MP.ws = null;
      setTimeout(() => ws.close(), 100);
    }
    history.replaceState(null, "", location.pathname);
    if (S.mode === "multi") S.mode = null;
    if (!silent) toast("You left the room.");
  }

  // ---------- a round ----------
  // No clock. When everyone has picked, the next prompt appears straight away;
  // each player gets a private toast with their own result. Everything is
  // revealed on the map at the end.
  function mpRound() {
    const r = MP.room;
    if (r.kind === "people") return mpPersonRound();
    if (r.kind === "year") return mpYearRound();
    const p = E.BY_PROMPT[r.promptId];
    if (!p) return toast("This page is out of date. Please reload.");
    stopTimer();
    $("#timer").hidden = true;
    S.prompts = [p];
    S.idx = 0;
    S.picks = [];
    S.sel = null;
    S.phase = mpMe()?.picked ? "waiting" : "pick";
    paint = { tiers: null, pick: null, pickTier: null };
    hideAllPanels();
    $("#runInfo").hidden = false;
    $("#zoomCtl").hidden = false;
    $("#modeLabel").textContent = modeLabel();
    updateScore();
    $("#promptCount").textContent = `Question ${r.round + 1} of ${r.rounds}`;
    $("#promptFamily").textContent = E.FAMILY_LABEL[p.family] || "";
    $("#promptText").textContent = p.text;
    $("#promptNote").textContent = p.note;
    $("#promptCard").hidden = false;
    $("#dock").hidden = false;
    $("#mpBoard").hidden = false;
    renderPick();
    if (S.phase === "waiting") mpWaiting();
    mpStartTimer(r);
    d3.select(canvas).transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    requestDraw();
  }

  function mpDrop() {
    if (S.phase !== "pick" || !S.sel || !MP.room) return;
    mpSend({ t: "pick", round: MP.room.round, country: S.sel.id, lonlat: S.sel.lonlat });
    S.phase = "waiting";
    mpWaiting();
    requestDraw();
  }

  function mpWaiting() {
    $("#dropBtn").hidden = true;
    const box = $("#pick");
    box.replaceChildren();
    const c = S.sel ? E.BY_ID[S.sel.id] : null;
    const waitingFor = mpPlayers().filter((p) => p.connected && !p.picked && p.id !== MP.me);
    box.append(!S.sel ? "Time's up" : c && settings.names ? `${c.flag} ${c.name} · locked in` : "Locked in");
    box.append(el("span", "sub", waitingFor.length ? ` · waiting for ${waitingFor.map((p) => p.name).join(", ")}…` : " · next question…"));
    // the host can move on if someone has wandered off
    const dock = $("#dock");
    dock.querySelector(".skip-btn")?.remove();
    if (MP.room.host === MP.me && waitingFor.length) {
      const skip = el("button", "btn skip-btn", "Skip");
      skip.title = "Move on without them (they score 0 for this question)";
      skip.addEventListener("click", () => mpSend({ t: "skip", round: MP.room.round }));
      dock.append(skip);
    }
  }

  // live scoreboard: who has picked, scores
  function mpBoard() {
    const r = MP.room;
    if (!r || r.state !== "round") return;
    const box = $("#mpBoard");
    box.replaceChildren();
    const sorted = [...r.players].sort((a, b) => b.score - a.score);
    for (const p of sorted) {
      const row = el("div", "row" + (p.id === MP.me ? " me" : "") + (p.connected ? "" : " off"));
      const sw = el("span", "swatch");
      sw.style.background = mpColor(p.id);
      row.append(sw, el("span", null, p.id === MP.me ? "You" : p.name), el("span", "state", p.picked ? "✓" : "…"), el("b", null, fmt(p.score)));
      box.append(row);
    }
    if (S.phase === "waiting") (r.kind === "people" ? mpGuessWaiting() : r.kind === "year" ? mpYearWaiting() : mpWaiting());
    updateScore();
  }

  // everyone's pins for one question (only available once the game is over)
  function mpPinsForRound(i) {
    const round = S.reviewRounds ? S.reviewRounds[i] : i;
    return mpPlayers()
      .map((p) => ({ p, pick: p.history?.[round] }))
      .filter((x) => x.pick && x.pick.lonlat)
      .map((x) => ({ lonlat: x.pick.lonlat, color: mpColor(x.p.id), label: x.p.id === MP.me ? "You" : x.p.name }));
  }

  // ---------- final standings ----------
  function mpOver() {
    const r = MP.room;
    if (!r || r.state !== "over") return;
    S.phase = "idle";
    S.sel = null;
    paint = { tiers: null, pick: null, pickTier: null };
    hideAllPanels();
    $("#runInfo").hidden = true;
    $("#zoomCtl").hidden = true;
    requestDraw();

    const ranked = [...r.players].sort((a, b) => b.score - a.score);
    const top = ranked[0]?.score ?? 0;
    const winners = ranked.filter((p) => p.score === top);
    $("#mpOverWinner").textContent =
      ranked.length < 2 ? `${fmt(top)} pts` : winners.length > 1 ? "It's a tie!" : winners[0].id === MP.me ? "You win! 🏆" : `${winners[0].name} wins! 🏆`;
    const ol = $("#mpStandings");
    ol.replaceChildren();
    for (const p of ranked) {
      const li = el("li", p.connected ? "" : "off");
      const sw = el("span", "swatch");
      sw.style.background = mpColor(p.id);
      const row = (p.history || []).map((h) => (!h ? "⬛" : h.kind === "year" ? window.Warpath.TIERS[h.tier].emoji : h.correct ? TIERS[h.tier].emoji : "⬛")).join("");
      li.append(sw, el("span", null, `${p.id === MP.me ? "You" : p.name}  ${row}`), el("b", null, `${fmt(p.score)} pts`));
      ol.append(li);
    }

    const actions = $("#mpOverActions");
    actions.replaceChildren();
    const btn = (label, primary, fn) => {
      const b = el("button", "btn" + (primary ? " primary" : ""), label);
      b.addEventListener("click", fn);
      actions.append(b);
    };
    const items = r.items || [];
    const mine = mpMe()?.history || [];
    const placeRounds = items.map((x, i) => (x.kind === "places" ? i : -1)).filter((i) => i >= 0);
    const openReview = (round) => {
      S.reviewRounds = placeRounds;
      S.prompts = placeRounds.map((i) => E.BY_PROMPT[items[i].id]);
      S.picks = placeRounds.map((i) => mine[i] || { prompt: items[i].id, country: null, correct: false, tier: null, points: 0 });
      showReview(Math.max(0, placeRounds.indexOf(round)));
    };
    if (placeRounds.length) btn(placeRounds.length === items.length ? "See all answers on the map" : "See the place answers on the map", true, () => openReview(placeRounds[0]));
    if (r.host === MP.me) btn("Rematch", !placeRounds.length, () => mpSend({ t: "start" }));
    btn("Leave room", false, () => {
      mpLeave(false);
      showHome();
    });
    if (r.host !== MP.me) actions.append(el("span", "small", "The host can start a rematch."));

    // per-question recap, each can be opened on the map
    const rounds = $("#mpOverRounds");
    rounds.replaceChildren();
    items.forEach((it, i) => {
      if (it.kind === "year") {
        const WPe = window.Warpath;
        const ev = WPe && WPe.LIST[it.id];
        if (!ev) return;
        const li = el("li");
        li.append(el("p", "ans-prompt", `${i + 1}. ${ev.text}`), el("p", "ans-why", `It happened in ${WPe.yearText(ev.y)}.`));
        for (const pl of ranked) {
          const h = pl.history?.[i];
          const row = el("div", "ans-pick");
          row.append(el("span", null, `${pl.id === MP.me ? "You" : pl.name}: ${h && h.guess != null ? WPe.yearText(h.guess) : "no answer"}`));
          row.append(el("span", "chip " + YEAR_CHIP[h ? h.tier : 5], `${WPe.TIERS[h ? h.tier : 5].what} +${fmt(h ? h.points : 0)}`));
          li.append(row);
        }
        rounds.append(li);
        return;
      }
      if (it.kind === "people") {
        const p = P.BY_ID?.[it.id];
        if (!p) return;
        const rows = ranked.map((pl) => {
          const h = pl.history?.[i];
          return [`${pl.id === MP.me ? "You" : pl.name}: ${h?.guess ? `“${h.guess}”` : "no guess"}${h?.hint ? " (hint)" : ""}`, h];
        });
        rounds.append(personRow(p, i + 1, rows, () => showPersonReveal(p, mine[i] || null, "Back to standings", mpOver)));
        return;
      }
      const p = E.BY_PROMPT[it.id];
      if (!p) return;
      const li = el("li");
      li.append(el("p", "ans-prompt", `${i + 1}. ${p.text}`));
      for (const pl of ranked) {
        const h = pl.history?.[i];
        const c = h?.country ? E.BY_ID[h.country] : null;
        const row = el("div", "ans-pick");
        row.append(el("span", null, `${pl.id === MP.me ? "You" : pl.name}: ${c ? `${c.flag} ${c.name}` : "no pin"}`));
        row.append(el("span", h?.correct ? `chip t${h.tier}` : "chip", h?.correct ? `${TIERS[h.tier].label} +${fmt(h.points)}` : "+0"));
        li.append(row);
      }
      const view = el("button", "link-btn", `View all ${p.answers.length} answers on the map →`);
      view.addEventListener("click", () => openReview(i));
      li.append(view);
      rounds.append(li);
    });
    $("#mpOver").hidden = false;
    $("#mpOver").scrollTop = 0;
  }

  // =====================================================================
  // Who lived here? A famous person's birth and death places are pinned;
  // type their name. Data (data/people.js) is loaded the first time it's needed.
  // =====================================================================
  const P = window.People;
  let peopleJob = null;
  function loadPeople() {
    if (P.LIST) return Promise.resolve();
    if (!peopleJob)
      peopleJob = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "data/people.js?v=6";
        s.onload = () => {
          P.init(window.PEOPLE);
          resolve();
        };
        s.onerror = () => {
          peopleJob = null;
          s.remove();
          reject(new Error("people data"));
        };
        document.head.append(s);
      });
    return peopleJob;
  }

  const placeIn = (e) => {
    const c = e.c ? E.BY_ID[e.c] : null;
    if (!c) return e.place;
    return e.place === c.name ? `${c.flag} ${c.name}` : `${e.place}, ${c.flag} ${c.name}`;
  };
  const short = (s, n = 30) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  function lifePaint(born, died, person) {
    if (!person) return { born: born.at, died: died.at, bornText: `Born ${P.dateText(born)}`, diedText: `Died ${P.dateText(died)}` };
    return {
      born: born.at,
      died: died.at,
      bornText: short(`Born ${P.yearText(born.y)} · ${person.born.place}`),
      diedText: short(`Died ${P.yearText(died.y)} · ${person.died.place}`),
      countries: [person.born.c, person.died.c].filter(Boolean),
    };
  }

  // Pick how famous the people are, then play.
  const PEOPLE_LEVELS = [
    ["veryeasy", "☆", "Very easy", "Only the most famous people in history."],
    ["easy", "★", "Easy", "Household names."],
    ["medium", "★★", "Medium", "Famous, but you'll have to think."],
    ["hard", "★★★", "Hard", "Deep cuts for experts."],
    ["rising", "↗", "Rising", "Starts easy and ends hard."],
  ];
  function choosePeople(infinite) {
    const inf = infinite === true;
    choose(
      inf ? "∞ Who lived here? · difficulty" : "Who lived here? · difficulty",
      PEOPLE_LEVELS.map(([lv, icon, name, desc]) => ({ icon, name: name + (lv === store.get("peopleLevel", "rising") ? " · last time" : ""), desc, go: () => navigate(() => startPeople(lv, inf)) }))
    );
  }
  async function startPeople(level, infinite) {
    if (typeof level === "string") store.set("peopleLevel", level);
    level = store.get("peopleLevel", "rising");
    hideAllPanels();
    if (!P.LIST) toast("Loading famous people…");
    try {
      await loadPeople();
    } catch {
      toast("Couldn't load the famous people list. Check your connection.");
      return showHome();
    }
    S.mode = "people";
    S.recorded = false;
    S.runNo = stats.people.runs + 1;
    S.daily = null;
    S.peopleInfinite = infinite === true;
    S.people = P.draw(Math.random, S.peopleInfinite ? 1 : 5, new Set(store.get("seenPeople", [])), level);
    S.picks = [];
    S.idx = 0;
    showPerson();
  }
  function showPerson() {
    const p = S.people[S.idx];
    showPersonClue(P.clue(p), S.peopleInfinite ? `∞ Person ${S.idx + 1}` : `Person ${S.idx + 1} of ${S.people.length}`);
  }

  // The question: two markers and the dates, nothing else.
  function showPersonClue(clue, count) {
    stopTimer();
    S.sel = null;
    S.phase = "guess";
    S.hint = false;
    paint = { tiers: null, pick: null, pickTier: null, life: lifePaint(clue.born, clue.died, null) };
    hideAllPanels();
    $("#runInfo").hidden = false;
    $("#zoomCtl").hidden = false;
    $("#timer").hidden = true;
    $("#modeLabel").textContent = modeLabel();
    updateScore();
    $("#promptCount").textContent = count;
    $("#promptFamily").textContent = "Who lived here?";
    $("#promptText").textContent = "Who was born at ★ and died at ✝?";
    $("#promptNote").textContent = `${P.dateText(clue.born)} – ${P.dateText(clue.died)} · lived to ${P.age(clue)}`;
    $("#promptCard").hidden = false;
    const input = $("#guessInput");
    input.value = "";
    input.disabled = false;
    $("#guessBtn").disabled = false;
    $("#hintBtn").disabled = false;
    $("#passBtn").disabled = false;
    $("#guessExtra").hidden = false;
    $("#guessStatus").hidden = true;
    $("#guessDock").hidden = false;
    if (!matchMedia("(pointer: coarse)").matches) input.focus({ preventScroll: true });
    requestDraw();
    fitLife();
  }

  function showHintText(text) {
    const h = $("#promptHint");
    h.textContent = `Hint: ${text}`;
    h.hidden = false;
  }
  function useHint() {
    if (S.phase !== "guess" || S.hint) return;
    S.hint = true;
    $("#hintBtn").disabled = true;
    if (S.mode === "multi") mpSend({ t: "hint", round: MP.room.round });
    else showHintText(P.hint(S.people[S.idx]));
  }

  function submitGuess(raw) {
    if (S.phase !== "guess") return;
    const text = String(raw || "").trim().slice(0, 60);
    if (S.mode === "multi") {
      mpSend({ t: "guess", round: MP.room.round, text });
      S.myGuess = text;
      S.phase = "waiting";
      mpGuessWaiting();
      return;
    }
    const p = S.people[S.idx];
    const pick = { person: p.id, guess: text, hint: S.hint, ...P.judge(p, text, S.hint) };
    S.picks.push(pick);
    const seen = store.get("seenPeople", []);
    seen.push(p.id);
    store.set("seenPeople", seen.slice(-400));
    updateScore();
    if (S.mode === "mix") {
      S.mixLog.push({ kind: "people", id: p.id, points: pick.points });
      updateScore();
      return showPersonReveal(p, pick, "Next question", nextMix, ["Stop", showHome]);
    }
    if (S.daily) store.set("dailyPeople." + S.daily, S.picks);
    if (S.peopleInfinite) {
      updateScore();
      return showPersonReveal(
        p,
        pick,
        "Next person",
        () => {
          const seenNow = new Set([...store.get("seenPeople", []), ...S.people.map((x) => x.id)]);
          S.people.push(P.draw(Math.random, 1, seenNow, store.get("peopleLevel", "rising"))[0]);
          S.idx++;
          showPerson();
        },
        ["Stop", showHome]
      );
    }
    const last = S.idx === S.people.length - 1;
    showPersonReveal(p, pick, last ? (S.daily ? "Next: the dates ▶" : "See results") : "Next person", () => {
      S.idx++;
      if (S.idx >= S.people.length) S.daily ? startDaily() : showPeopleCamp();
      else showPerson();
    });
  }

  // The answer: photo, name, where and when they were born and died, why they matter.
  function showPersonReveal(p, pick, primaryLabel, onPrimary, secondary) {
    stopTimer();
    S.phase = "person";
    hideAllPanels();
    $("#runInfo").hidden = false;
    $("#zoomCtl").hidden = false;
    $("#modeLabel").textContent = modeLabel();
    updateScore();
    paint = { tiers: null, pick: null, pickTier: null, life: lifePaint(p.born, p.died, p) };

    const sheet = $("#personSheet");
    sheet.replaceChildren();
    const head = el("div", "person-head");
    const photo = el("div", "person-photo");
    const initials = p.name.split(/\s+/).map((w) => w[0]).filter((ch) => /\p{Lu}/u.test(ch)).slice(0, 2).join("");
    const src = P.photo(p, 320);
    if (src) {
      const img = el("img");
      img.alt = p.name;
      img.decoding = "async";
      img.onerror = () => photo.replaceChildren(initials);
      img.src = src;
      photo.append(img);
    } else photo.append(initials);

    const info = el("div", "person-info");
    const top = el("div", "person-top");
    const chip = pick
      ? el("span", pick.correct ? `chip t${pick.tier}` : "chip", pick.correct ? `${P.TIERS[pick.tier].label} +${fmt(pick.points)}${pick.hint ? " (hint)" : ""}` : pick.guess ? "Not quite · +0" : "Passed · +0")
      : el("span", `chip t${P.tierOf(p)}`, `${P.TIERS[P.tierOf(p)].label} · ${fmt(P.TIERS[P.tierOf(p)].points)} pts`);
    top.append(chip);
    info.append(top, el("h3", "person-name", p.name));
    if (p.desc) info.append(el("p", "person-desc", p.desc.charAt(0).toUpperCase() + p.desc.slice(1)));
    const life = el("dl", "person-life");
    life.append(el("dt", "born", "★ Born"), el("dd", null, `${P.dateText(p.born)} in ${placeIn(p.born)}`));
    life.append(el("dt", "died", "✝ Died"), el("dd", null, `${P.dateText(p.died)} in ${placeIn(p.died)}, aged ${P.age(p)}`));
    info.append(life);
    if (pick) info.append(el("p", "person-guess", pick.guess ? `Your guess: “${pick.guess}”${pick.correct ? " ✓" : ""}` : "You didn't guess."));
    head.append(photo, info);
    sheet.append(head);

    const known = el("div", "person-known");
    known.append(el("h4", null, "Why they're remembered"));
    const para = el("p", null, "Loading from Wikipedia…");
    known.append(para);
    sheet.append(known);
    wikiSummary(p.wiki || p.name).then((w) => {
      if (!w || !w.extract) return para.replaceChildren(p.desc ? `${p.name}: ${p.desc}.` : "Couldn't reach Wikipedia right now.");
      const sentences = w.extract.match(/[^.!?]+[.!?]+(\s|$)/g) || [w.extract];
      let text = "";
      for (const x of sentences) {
        if (text && text.length + x.length > 420) break;
        text += x;
      }
      para.textContent = text.trim();
      if (!src && w.thumbnail?.source) {
        const img = el("img");
        img.alt = p.name;
        img.src = w.thumbnail.source;
        photo.replaceChildren(img);
      }
    });

    const actions = el("div", "sheet-actions");
    const more = el("button", "btn", "Read more");
    more.addEventListener("click", () => openTopic(p.wiki || p.name));
    const next = el("button", "btn primary", primaryLabel);
    next.addEventListener("click", onPrimary);
    if (secondary) {
      const sb = el("button", "btn", secondary[0]);
      sb.addEventListener("click", secondary[1]);
      actions.append(sb);
    }
    actions.append(more, next);
    sheet.append(actions);

    sheet.hidden = false;
    sheet.scrollTop = 0;
    next.focus({ preventScroll: true });
    requestDraw();
    fitLife();
  }

  function showPeopleCamp() {
    if (!S.recorded) {
      S.recorded = true;
      stats.people.runs++;
      stats.people.best = Math.max(stats.people.best, runScore());
      store.set("stats", stats);
    }
    S.phase = "idle";
    paint = { tiers: null, pick: null, pickTier: null };
    hideAllPanels();
    $("#zoomCtl").hidden = true;
    $("#runInfo").hidden = true;
    clearInterval(cdId);
    $("#countdown").textContent = "";
    requestDraw();

    $("#campEyebrow").textContent = `Who lived here? · game ${S.runNo}`;
    $("#campScore").textContent = `${fmt(runScore())} pts`;
    $("#campEmoji").textContent = S.picks.map((p) => (p.correct ? P.TIERS[p.tier].emoji : "⬛")).join(" ");
    const actions = $("#campActions");
    actions.replaceChildren();
    const btn = (label, primary, fn) => {
      const b = el("button", "btn" + (primary ? " primary" : ""), label);
      b.addEventListener("click", fn);
      actions.append(b);
    };
    btn("Play again", true, startPeople);
    btn("Share", false, async () => {
      const row = S.picks.map((p) => (p.correct ? P.TIERS[p.tier].emoji : "⬛")).join("");
      const url = /^https?:/.test(location.href) ? `\n${location.origin}${location.pathname}` : "";
      const text = `Avdle · Who lived here? · ${fmt(runScore())} pts\n${row}${url}`;
      try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text });
        else {
          await navigator.clipboard.writeText(text);
          toast("Result copied to clipboard");
        }
      } catch {
        toast("Couldn't share from here.");
      }
    });
    btn("Home", false, showHome);
    const list = $("#campList");
    list.replaceChildren();
    S.picks.forEach((pick, i) => {
      const p = P.BY_ID[pick.person];
      list.append(personRow(p, i + 1, [[pick.guess ? `Your guess: “${pick.guess}”` : "No guess", pick]], () =>
        showPersonReveal(p, pick, "Back to results", showPeopleCamp)
      ));
    });
    $("#camp").hidden = false;
    $("#camp").scrollTop = 0;
  }

  // One person in a results list: photo, name, life, and each player's guess.
  function personRow(p, n, rows, onOpen) {
    const li = el("li", "person-li");
    const src = P.photo(p, 160);
    const thumb = el("img", "thumb");
    thumb.alt = "";
    thumb.loading = "lazy";
    if (src) thumb.src = src;
    thumb.onerror = () => (thumb.style.visibility = "hidden");
    li.append(thumb);
    li.append(el("p", "ans-prompt", `${n}. ${p.name}`));
    li.append(el("p", "ans-why", `${P.yearText(p.born.y)}–${P.yearText(p.died.y)} · ${p.desc || ""}`));
    for (const [label, pick] of rows) {
      const row = el("div", "ans-pick");
      row.append(el("span", null, label));
      row.append(el("span", pick?.correct ? `chip t${pick.tier}` : "chip", pick?.correct ? `${P.TIERS[pick.tier].label} +${fmt(pick.points)}` : "+0"));
      li.append(row);
    }
    const view = el("button", "link-btn", "Show on the map →");
    view.addEventListener("click", onOpen);
    li.append(view);
    return li;
  }

  // ---------- Who lived here? in rooms ----------
  function mpPersonRound() {
    const r = MP.room;
    if (!r.clue) return;
    S.mode = "multi";
    showPersonClue(r.clue, `Person ${r.round + 1} of ${r.rounds}`);
    $("#promptCount").textContent = `Question ${r.round + 1} of ${r.rounds}`;
    $("#mpBoard").hidden = false;
    mpStartTimer(r);
    if (mpMe()?.picked) {
      S.phase = "waiting";
      mpGuessWaiting();
    }
  }
  function mpGuessWaiting() {
    $("#guessInput").disabled = true;
    $("#guessBtn").disabled = true;
    $("#guessExtra").hidden = true;
    const st = $("#guessStatus");
    st.replaceChildren();
    const waitingFor = mpPlayers().filter((p) => p.connected && !p.picked && p.id !== MP.me);
    st.append(el("span", null, `${S.myGuess ? `“${S.myGuess}” locked in` : "No guess"} · ${waitingFor.length ? `waiting for ${waitingFor.map((p) => p.name).join(", ")}…` : "revealing…"}`));
    if (MP.room.host === MP.me && waitingFor.length) {
      const skip = el("button", "btn", "Skip");
      skip.title = "Move on without them (they score 0 for this person)";
      skip.addEventListener("click", () => mpSend({ t: "skip", round: MP.room.round }));
      st.append(skip);
    }
    st.hidden = false;
  }
  // Your result for the round that just ended. It stays on screen until you press Next.
  function mpPersonResult(m) {
    MP.hold = true;
    S.myGuess = "";
    const go = () => {
      const p = P.BY_ID[m.person];
      if (!p) return;
      const last = m.round + 1 >= m.rounds;
      const timed = MP.room?.settings?.timer && !last;
      showPersonReveal(p, m, last ? "See standings" : timed ? "Next question (clock running)" : "Next question", () => {
        MP.hold = false;
        MP.shown = null;
        if (MP.room) mpRender();
      });
      $("#mpBoard").hidden = true;
    };
    loadPeople().then(go, () => {
      MP.hold = false;
      toast("Couldn't load the famous people list.");
    });
  }
  // =====================================================================
  // Navigation: menu, Exit, and a check before leaving a game in progress
  // =====================================================================
  function leaveMessage() {
    if (S.mode === "multi" && MP.creds) return ["Leave the room?", "Your friends can keep playing without you."];
    const playing = ["pick", "verdict", "guess", "person", "waiting", "year"].includes(S.phase);
    if (!playing || S.mode === "daily" || S.mode === "practice" || S.mode === "infinite" || S.mode === "mix") return null; // the daily saves itself; infinite has no end to lose
    if (S.mode === "people" && (S.daily || S.peopleInfinite || S.picks.length >= S.people.length)) return null;
    if (S.mode === "unlimited" && S.picks.length >= S.prompts.length) return null;
    return ["Leave this game?", "Your score so far won't be saved."];
  }
  let onConfirm = null;
  function navigate(go) {
    const msg = leaveMessage();
    const run = () => {
      stopTimer();
      if (MP.creds) mpLeave(true);
      go();
    };
    if (!msg) return run();
    $("#confirmTitle").textContent = msg[0];
    $("#confirmText").textContent = msg[1];
    onConfirm = run;
    $("#confirmDlg").showModal();
  }
  $("#confirmDlg").addEventListener("close", () => {
    const f = onConfirm;
    onConfirm = null;
    if ($("#confirmDlg").returnValue === "leave" && f) f();
  });
  const GO = {
    home: showHome,
    daily: startDaily,
    unlimited: startUnlimited,
    people: choosePeople,
    friends: () => showLobby(),
    infinite: () => showHowTo("infinite", startInfinite),
    practice: startPractice,
  };
  $("#menuBtn").addEventListener("click", () => $("#menuDlg").showModal());
  $("#menuDlg").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-go]");
    if (ev.target === $("#menuDlg")) return $("#menuDlg").close(); // tap outside
    if (!b) return;
    $("#menuDlg").close();
    const go = b.dataset.go;
    if (go === "help") showHowTo(currentHowTo());
    else if (go === "settings") $("#settingsBtn").click();
    else if (go === "infinite") chooseInfinite();
    else if (go === "people") choosePeople();
    else if (go === "friends") navigate(() => showLobby());
    else if (GO[go]) navigate(GO[go]);
  });
  $("#exitBtn").addEventListener("click", () => navigate(showHome));

  // ---------- dialogs, toast, settings ----------
  let toastId = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastId);
    toastId = setTimeout(() => t.classList.remove("show"), 2200);
  }

  const tierTable = $("#tierTable");
  TIERS.forEach((t, i) => {
    const li = el("li");
    li.append(el("span", `chip t${i}`, t.label), el("span", null, `${fmt(t.points)} pts`));
    tierTable.append(li);
  });
  const wrongLi = el("li");
  wrongLi.append(el("span", "chip", "Off the map"), el("span", null, "0 pts"));
  tierTable.append(wrongLi);

  function applyTheme() {
    document.documentElement.dataset.theme = settings.night ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]').content = settings.night ? "#121826" : "#ffffff";
    readTheme();
    requestDraw();
  }

  $("#helpBtn").addEventListener("click", () => showHowTo(currentHowTo()));
  $("#settingsBtn").addEventListener("click", () => {
    $("#optNames").checked = settings.names;
    $("#optBorders").checked = settings.borders;
    $("#optTimer").checked = settings.timer;
    $("#optNight").checked = settings.night;
    $("#settingsDlg").showModal();
  });
  for (const [id, key] of [["optNames", "names"], ["optBorders", "borders"], ["optTimer", "timer"], ["optNight", "night"]])
    $("#" + id).addEventListener("change", (ev) => {
      settings[key] = ev.target.checked;
      store.set("settings", settings);
      if (key === "night") applyTheme();
      if (S.phase === "pick") {
        renderPick();
        if (key === "timer") startTimer();
      }
      requestDraw();
    });

  $("#homeBtn").addEventListener("click", () => navigate(showHome));
  $("#playDaily").addEventListener("click", startDaily);
  // =====================================================================
  // Dates: guess the year a moment happened (judged by the Warpath engine)
  // =====================================================================
  const WP = () => window.Warpath;
  const YEAR_CHIP = ["t4", "t3", "t2", "t1", "", ""]; // exact .. way off, no answer
  const YSTOPS = [[0, -3499], [120, -499], [250, 500], [420, 1500], [580, 1800], [700, 1900], [1000, 2026]];
  const yLerp = (a, b, t) => a + (b - a) * t;
  const yPosToAst = (p) => {
    for (let i = 1; i < YSTOPS.length; i++) if (p <= YSTOPS[i][0]) return Math.round(yLerp(YSTOPS[i - 1][1], YSTOPS[i][1], (p - YSTOPS[i - 1][0]) / (YSTOPS[i][0] - YSTOPS[i - 1][0])));
    return 2026;
  };
  const yAstToPos = (a) => {
    for (let i = 1; i < YSTOPS.length; i++) if (a <= YSTOPS[i][1]) return yLerp(YSTOPS[i - 1][0], YSTOPS[i][0], (a - YSTOPS[i - 1][1]) / (YSTOPS[i][1] - YSTOPS[i - 1][1]));
    return 1000;
  };
  S.yearAst = 1500;
  const yClamp = (a) => Math.max(WP().ast(WP().MIN_YEAR), Math.min(WP().ast(WP().MAX_YEAR), a));
  function yearRender(fromInput) {
    const y = WP().fromAst(S.yearAst);
    if (!fromInput) $("#yearInput").value = String(Math.abs(y));
    $("#yearEra").textContent = y < 0 ? "BC" : "AD";
    $("#yearEra").classList.toggle("bc", y < 0);
    $("#yearRange").value = String(Math.round(yAstToPos(S.yearAst)));
  }
  const yearSet = (a) => {
    S.yearAst = yClamp(a);
    yearRender();
  };
  for (const b of document.querySelectorAll(".year-step")) b.addEventListener("click", () => yearSet(S.yearAst + Number(b.dataset.step)));
  $("#yearEra").addEventListener("click", () => yearSet(WP().ast(-WP().fromAst(S.yearAst) || 1)));
  $("#yearRange").addEventListener("input", () => {
    S.yearAst = yClamp(yPosToAst(Number($("#yearRange").value)));
    yearRender();
  });
  $("#yearInput").addEventListener("input", () => {
    const inp = $("#yearInput");
    inp.value = inp.value.replace(/\D/g, "").slice(0, 4);
    const v = Number(inp.value);
    if (!v) return;
    const bc = WP().fromAst(S.yearAst) < 0;
    S.yearAst = yClamp(WP().ast(bc ? -v : v));
    yearRender(true);
  });
  $("#yearInput").addEventListener("focus", () => $("#yearInput").select());
  $("#yearForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (S.phase !== "year" || !S.onYear) return;
    const f = S.onYear;
    S.onYear = null;
    f(WP().fromAst(S.yearAst));
  });
  function showYearQuestion(clue, countLabel, onLock) {
    stopTimer();
    S.sel = null;
    S.phase = "year";
    S.onYear = onLock;
    paint = { tiers: null, pick: null, pickTier: null };
    S.keepDots = true;
    hideAllPanels();
    S.keepDots = false;
    $("#runInfo").hidden = false;
    $("#zoomCtl").hidden = true;
    $("#modeLabel").textContent = modeLabel();
    updateScore();
    const mult = WP().MULT[clue.fame] || 1;
    $("#promptCount").textContent = countLabel;
    $("#promptFamily").textContent = `📅 ${WP().CATS[clue.cat] || "Dates"}`;
    $("#promptText").textContent = clue.text;
    $("#promptNote").textContent = mult > 1 ? `In what year did this happen? A harder one: worth ×${mult}.` : "In what year did this happen?";
    $("#promptCard").hidden = false;
    $("#yearDock").hidden = false;
    $("#yearStatus").hidden = true;
    for (const n of $("#yearForm").querySelectorAll("input, button")) n.disabled = false;
    S.yearAst = 1500;
    yearRender();
    const where = dotWorld(true, clue);
    if (where) $("#promptNote").textContent += ` · ${where.empire}: a ${where.foe} blocks the road.`;
    if (matchMedia("(pointer: fine)").matches) setTimeout(() => $("#yearInput").focus(), 60);
    requestDraw();
  }
  function showYearResult(ev, res, primaryLabel, onPrimary, secondary) {
    const W2 = WP();
    S.phase = "verdict";
    S.keepDots = true;
    hideAllPanels();
    S.keepDots = false;
    $("#runInfo").hidden = false;
    updateScore();
    const chip = $("#verdictChip");
    chip.className = "chip " + YEAR_CHIP[res.tier];
    chip.textContent = W2.TIERS[res.tier].what;
    $("#verdictPoints").textContent = `+${fmt(res.points)}`;
    $("#verdictTitle").textContent = `It happened in ${W2.yearText(ev.y)}`;
    const off = res.off == null ? "" : res.off === 0 ? " Spot on!" : ` That's ${fmt(res.off)} year${res.off === 1 ? "" : "s"} off.`;
    const fact = W2.factText(ev);
    $("#verdictWhy").textContent = `${ev.text}. You said ${res.guess != null ? W2.yearText(res.guess) : "nothing"}.${off}${fact ? " " + fact : ""}`;
    const actions = $("#sheetActions");
    actions.replaceChildren();
    if (secondary) {
      const b = el("button", "btn", secondary[0]);
      b.addEventListener("click", secondary[1]);
      actions.append(b);
    }
    const next = el("button", "btn primary", primaryLabel);
    next.addEventListener("click", onPrimary);
    actions.append(next);
    $("#sheet").hidden = false;
    next.focus({ preventScroll: true });
    // the battle plays out in the dot world behind the card: the closer the year, the bigger the win
    window.WarpathUI?.backdropFight?.(res.tier);
    requestDraw();
  }
  // rooms
  function mpYearRound() {
    const r = MP.room;
    if (!r.clue) return;
    S.mode = "multi";
    S.myYear = null;
    showYearQuestion(r.clue, `Question ${r.round + 1} of ${r.rounds}`, (y) => {
      mpSend({ t: "year", round: r.round, year: y });
      S.myYear = y;
      S.phase = "waiting";
      mpYearWaiting();
    });
    $("#mpBoard").hidden = false;
    mpStartTimer(r);
    if (mpMe()?.picked) {
      S.phase = "waiting";
      mpYearWaiting();
    }
  }
  function mpYearWaiting() {
    for (const n of $("#yearForm").querySelectorAll("input, button")) n.disabled = true;
    const st = $("#yearStatus");
    st.replaceChildren();
    const waitingFor = mpPlayers().filter((p) => p.connected && !p.picked && p.id !== MP.me);
    st.append(el("span", null, `${S.myYear != null ? `${WP().yearText(S.myYear)} locked in` : "No answer"} · ${waitingFor.length ? `waiting for ${waitingFor.map((p) => p.name).join(", ")}…` : "revealing…"}`));
    if (MP.room.host === MP.me && waitingFor.length) {
      const skip = el("button", "btn", "Skip");
      skip.title = "Move on without them (they score 0 for this question)";
      skip.addEventListener("click", () => mpSend({ t: "skip", round: MP.room.round }));
      st.append(skip);
    }
    st.hidden = false;
  }
  function mpYearResult(m) {
    const ev = WP() && WP().LIST[m.event];
    if (!ev) return;
    MP.hold = true;
    const last = m.round + 1 >= m.rounds;
    const timed = MP.room?.settings?.timer && !last;
    showYearResult(ev, m, last ? "See standings" : timed ? "Next question (clock running)" : "Next question", () => {
      MP.hold = false;
      MP.shown = null;
      if (MP.room) mpRender();
    });
    $("#mpBoard").hidden = true;
  }

  // =====================================================================
  // Infinite mix: random questions from the kinds you pick
  // =====================================================================
  const MIX_KINDS = [
    ["places", "🌍", "Countries", "Pin a country that fits"],
    ["people", "★", "Famous people", "Who was born and died here?"],
    ["years", "📅", "Dates", "Guess the year it happened"],
  ];
  const YEAR_LEVEL_OPTS = [1, 2, 3, 4, 5].map((v) => [v, ["", "Recruit", "Soldier", "Centurion", "Champion", "Legend"][v], ["", "Household names", "Mostly famous", "Takes some history", "History buffs", "Deep cuts"][v]]);
  // tick one or more kinds of question
  function catPicker(cats, editable, onChange) {
    const grid = el("div", "cat-grid");
    for (const [k, icon, name, desc] of MIX_KINDS) {
      const on = cats.includes(k);
      const b = el("button", "cat-opt" + (on ? " on" : ""));
      b.type = "button";
      b.disabled = !editable;
      b.setAttribute("aria-pressed", String(on));
      b.append(el("i", null, icon), el("b", null, name), el("span", null, desc), el("em", null, on ? "✓" : "+"));
      b.addEventListener("click", () => {
        if (!editable) return;
        const next = on ? cats.filter((c) => c !== k) : [...cats, k];
        if (next.length) onChange(MIX_KINDS.map((x) => x[0]).filter((x) => next.includes(x)));
        else toast("Pick at least one.");
      });
      grid.append(b);
    }
    return grid;
  }
  function chooseInfinite() {
    const dlg = $("#chooseDlg");
    $("#chooseTitle").textContent = "∞ Infinite mode";
    const list = $("#chooseList");
    let cats = store.get("mixCats", ["places"]).filter((c) => MIX_KINDS.some((x) => x[0] === c));
    if (!cats.length) cats = ["places"];
    const draw = () => {
      list.replaceChildren();
      list.append(el("p", "small", cats.length > 1 ? `A random mix of ${cats.length} kinds, one question after another, forever.` : "Tick more than one for a random mix. It never ends."));
      list.append(
        catPicker(cats, true, (next) => {
          cats = next;
          draw();
        })
      );
      const go = el("button", "btn primary wide", cats.length > 1 ? `Play the mix ▶` : `Play ${MIX_KINDS.find((x) => x[0] === cats[0])[2].toLowerCase()} ▶`);
      go.type = "button";
      go.addEventListener("click", () => {
        store.set("mixCats", cats);
        dlg.close();
        if (cats.length === 1 && cats[0] === "places") navigate(() => showHowTo("infinite", startInfinite));
        else if (cats.length === 1 && cats[0] === "people") choosePeople(true);
        else navigate(() => startMix(cats));
      });
      const war = el("button", "choose-opt war");
      war.type = "button";
      war.append(el("i", null, "⚔"), el("b", null, "Warpath march"), el("span", null, "Endless dates with dot-matrix battles across an empire."));
      war.addEventListener("click", () => {
        dlg.close();
        openWarpath({ infinite: true });
      });
      list.append(go, el("p", "small center choose-or", "or"), war);
    };
    draw();
    dlg.showModal();
  }
  async function startMix(cats) {
    if (cats.includes("people") && !P.LIST) {
      toast("Loading famous people…");
      try {
        await loadPeople();
      } catch {
        toast("Couldn't load the famous people list.");
        cats = cats.filter((c) => c !== "people");
        if (!cats.length) return showHome();
      }
    }
    S.mode = "mix";
    S.cats = cats;
    S.mixLog = [];
    nextMix();
  }
  function nextMix() {
    const n = S.mixLog.length + 1;
    const done = (kind) => new Set(S.mixLog.filter((x) => x.kind === kind).map((x) => x.id));
    // random kind, but not the same one three times running
    let kind = S.cats[Math.floor(Math.random() * S.cats.length)];
    const last2 = S.mixLog.slice(-2).map((x) => x.kind);
    if (S.cats.length > 1 && last2.length === 2 && last2.every((k) => k === kind)) kind = S.cats.find((k) => k !== kind);
    if (kind === "places") {
      const p = E.drawPrompts(Math.random, 1, new Set([...store.get("seen", []), ...done("places")]))[0];
      S.prompts = [p];
      S.idx = 0;
      S.picks = [];
      hideAllPanels();
      $("#runInfo").hidden = false;
      $("#zoomCtl").hidden = false;
      showPrompt();
      $("#promptCount").textContent = `∞ Question ${n} · 🌍 country`;
    } else if (kind === "people") {
      const person = P.draw(Math.random, 1, new Set([...store.get("seenPeople", []), ...done("people")]), store.get("peopleLevel", "rising"))[0];
      S.people = [person];
      S.idx = 0;
      S.picks = [];
      showPersonClue(P.clue(person), `∞ Question ${n} · ★ person`);
    } else {
      const ev = WP().draw(Math.random, 1, store.get("yearLevel", 2), done("years"))[0];
      showYearQuestion(WP().clue(ev), `∞ Question ${n} · 📅 date`, (y) => {
        const res = { ...WP().judge(ev, y), guess: y };
        S.mixLog.push({ kind: "years", id: ev.id, points: res.points });
        showYearResult(ev, res, "Next question", nextMix, ["Stop", showHome]);
      });
    }
  }

  // =====================================================================
  // Animated "how to play" screens, one per game. The ? button shows the one for the game you're in.
  // =====================================================================
  const HT_ART = {
    read: '<svg class="ht-art" viewBox="0 0 120 80"><g class="ht-scroll"><path d="M22 18h70a8 8 0 0 1 0 16H30"/><path d="M30 34v28a8 8 0 0 0 8 8h62"/><path d="M92 34v28a8 8 0 0 0 8 8 8 8 0 0 0 0-16h-8"/><path class="ht-line l1" d="M42 46h40"/><path class="ht-line l2" d="M42 54h32"/><path class="ht-line l3" d="M42 62h22"/></g></svg>',
    pin: '<svg class="ht-art" viewBox="0 0 120 80"><ellipse cx="60" cy="66" rx="46" ry="9" class="ht-fill"/><path d="M22 64q14-10 26-4t26-2 24 4"/><ellipse class="ht-shadow" cx="60" cy="66" rx="8" ry="2.4"/><g class="ht-pin"><path d="M60 64c-2-7-12-12-12-21a12 12 0 0 1 24 0c0 9-10 14-12 21z" class="ht-pinbody"/><circle cx="60" cy="43" r="4.5" class="ht-pinhole"/></g><g class="ht-ripple"><ellipse cx="60" cy="66" rx="10" ry="3"/></g></svg>',
    tiers: '<div class="ht-tiers"><span class="chip t0">100</span><span class="chip t1">250</span><span class="chip t2">450</span><span class="chip t3">700</span><span class="chip t4">1,000</span></div>',
    people: '<svg class="ht-art" viewBox="0 0 120 80"><path d="M10 60q30-22 60-8t40-6" stroke-dasharray="3 5"/><g class="ht-star"><path d="M26 30l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" class="ht-fill-solid"/></g><g class="ht-cross"><path d="M94 26v24M86 34h16"/></g><path class="ht-arc" d="M30 48Q60 6 94 40"/></svg>',
    type: '<div class="ht-typing"><span class="ht-typed">Gandhi</span><i class="ht-caret"></i></div>',
    hint: '<div class="ht-tiers"><span class="chip t3">700</span><span class="ht-arrow">→ hint →</span><span class="chip t1">350</span></div>',
    globe: '<svg class="ht-art" viewBox="0 0 120 80"><g class="ht-spin"><circle cx="60" cy="40" r="28"/><ellipse cx="60" cy="40" rx="12" ry="28"/><path d="M32 40h56M36 26h48M36 54h48"/></g></svg>',
    infinity: '<svg class="ht-art" viewBox="0 0 120 80"><path class="ht-inf" d="M60 40c-10-14-34-14-34 0s24 14 34 0 34-14 34 0-24 14-34 0z"/></svg>',
    calendar: '<svg class="ht-art" viewBox="0 0 120 80"><g class="ht-pop"><rect x="34" y="16" width="52" height="52" rx="6"/><path d="M34 30h52M46 10v12M74 10v12"/><text x="60" y="58" text-anchor="middle" class="ht-num">11</text></g></svg>',
    room: '<svg class="ht-art" viewBox="0 0 120 80"><g class="ht-pop"><rect x="26" y="22" width="68" height="32" rx="8"/><text x="60" y="44" text-anchor="middle" class="ht-num small">ABCD</text></g><g class="ht-fly"><path d="M96 20l14-6-6 14z"/></g></svg>',
    swords: '<svg class="ht-art" viewBox="0 0 120 80"><g class="ht-clash"><path d="M30 68L80 18M74 14l10 0 0 10M38 56l10 10M26 72l7-7"/><path d="M90 68L40 18M46 14l-10 0 0 10M82 56L72 66M94 72l-7-7"/></g></svg>',
    trophy: '<svg class="ht-art" viewBox="0 0 120 80"><g class="ht-pop"><path d="M44 14h32v14c0 12-7 20-16 20s-16-8-16-20z" class="ht-fill"/><path d="M44 18H34c0 10 6 14 12 14M76 18h10c0 10-6 14-12 14M60 48v10M48 66h24l-3-8H51z"/></g><path class="ht-spark s1" d="M24 20l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z"/><path class="ht-spark s2" d="M98 44l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z"/></svg>',
  };
  const HOWTO = {
    countries: {
      eyebrow: "How to play",
      title: "Pin the country",
      steps: [
        ["read", "Read the prompt", "“Pin a country the Danube flows through.”"],
        ["pin", "Drop your pin", "Any right answer scores. Tap, zoom, and lock it in."],
        ["tiers", "Go for the long shot", "Obvious answers earn 100. The ones nobody thinks of earn 1,000."],
      ],
      extra: true,
    },
    infinite: {
      eyebrow: "∞ Infinite mode",
      title: "Pin the country, forever",
      steps: [
        ["read", "Read the prompt", "“Pin a country the Danube flows through.”"],
        ["pin", "Drop your pin", "Every answer shows on the map straight away, so you learn as you go."],
        ["infinity", "It never ends", "Tap Next prompt for another, as long as you like. Stop whenever you want."],
      ],
      extra: true,
    },
    people: {
      eyebrow: "How to play",
      title: "Who lived here?",
      steps: [
        ["people", "Two markers", "★ is where a famous person was born, ✝ where they died, with the dates."],
        ["type", "Type their name", "The surname is enough and small typos are fine. A famous shared surname needs the first name too."],
        ["hint", "A hint halves the points", "Less famous people score more, from 100 up to 1,000."],
      ],
    },
    daily: {
      eyebrow: "Today's Avdle",
      title: "Eleven questions, same for everyone",
      steps: [
        ["globe", "5 countries", "Pin a country that fits each prompt. The rarer the answer, the more it scores."],
        ["people", "3 famous people", "Name who was born at ★ and died at ✝."],
        ["calendar", "3 dates", "Guess the year of three moments in history, Warpath style."],
      ],
      foot: "Your answers save as you go, so you can stop and come back. A new Avdle starts every midnight.",
    },
    friends: {
      eyebrow: "Play with friends",
      title: "One room, same questions",
      steps: [
        ["room", "Make a room", "Tick what to play: countries, famous people, dates, or several for a random mix. Set the length and the clock, then share the 4-letter code or the link."],
        ["pin", "Everyone answers", "You all get the same questions. Each of you sees only your own result until the end."],
        ["trophy", "Standings", "The final table shows everyone's answers. The host can change the rules or start a rematch."],
      ],
    },
    dates: {
      eyebrow: "How to play",
      title: "Dates: guess the year",
      steps: [
        ["read", "Read the moment", "“Vasco da Gama reaches Calicut by sea.” From 3500 BC to today."],
        ["calendar", "Set the year", "Drag the slider, tap −10/−1/+1/+10, or type it. Tap AD to switch to BC."],
        ["tiers", "Closer scores more", "Exact year 1,000, then close, near, rough. Older moments allow more years off, and hard ones score up to ×2."],
      ],
    },
    warpath: {
      eyebrow: "How to play",
      title: "Warpath",
      steps: [
        ["swords", "Pick an empire", "13 empires, from Ashoka's Maurya to Napoleon's France, each with its real enemies."],
        ["calendar", "Guess the year to fight", "Every moment in history is a battle. The closer your year, the bigger the win."],
        ["trophy", "Build the wonder", "Exact years, or close calls on hard moments, raise the empire's great monument."],
      ],
    },
  };
  function currentHowTo() {
    if (!$("#home").hidden) return "countries";
    if (S.mode === "multi") return "friends";
    if (S.mode === "daily" || (S.mode === "people" && S.daily)) return "daily";
    if (S.mode === "people") return "people";
    if (S.mode === "infinite" || S.mode === "mix") return S.phase === "year" ? "dates" : "infinite";
    if (S.phase === "year") return "dates";
    return "countries";
  }
  const HOWTO_TABS = [
    ["countries", "🌍 Countries"],
    ["daily", "📆 Today's Avdle"],
    ["people", "★ Who lived here?"],
    ["dates", "📅 Dates"],
    ["infinite", "∞ Infinite"],
    ["friends", "⚑ Friends"],
    ["warpath", "⚔ Warpath"],
  ];
  function showHowTo(kind, onStart) {
    const h = HOWTO[kind] || HOWTO.countries;
    if (onStart && store.get("howtoSkip." + kind, false)) return onStart();
    const box = $("#howtoPanel");
    box.replaceChildren();
    if (!onStart) {
      // tabs: learn any game from here
      const tabs = el("div", "ht-tabs");
      tabs.setAttribute("role", "tablist");
      for (const [k, label] of HOWTO_TABS) {
        const t = el("button", "ht-tab" + (k === kind ? " on" : ""), label);
        t.type = "button";
        t.setAttribute("role", "tab");
        t.setAttribute("aria-selected", String(k === kind));
        t.addEventListener("click", () => k !== kind && showHowTo(k));
        tabs.append(t);
      }
      box.append(tabs);
      setTimeout(() => tabs.querySelector(".on")?.scrollIntoView({ inline: "center", block: "nearest" }), 0);
    }
    box.append(el("p", "eyebrow ht-eyebrow", h.eyebrow), el("h2", "title small-title ht-title", h.title));
    const steps = el("ol", "ht-steps");
    h.steps.forEach(([art, title, text], i) => {
      const li = el("li", "ht-step");
      li.style.setProperty("--d", `${0.15 + i * 0.22}s`);
      const pic = el("div", "ht-pic");
      pic.innerHTML = HT_ART[art] || "";
      const words = el("div", "ht-words");
      words.append(el("b", null, `0${i + 1}`), el("strong", null, title), el("span", null, text));
      li.append(pic, words);
      steps.append(li);
    });
    box.append(steps);
    if (h.foot) box.append(el("p", "small center ht-foot", h.foot));
    if (h.extra) {
      const topics = $("#topics").textContent;
      if (topics) box.append(el("p", "topics ht-foot", topics));
      const stats = $("#statsRow");
      if (stats.children.length) {
        const row = el("div", "stats-row ht-foot");
        for (const c of stats.children) row.append(c.cloneNode(true));
        box.append(row);
      }
    }
    const acts = el("div", "camp-actions ht-actions");
    const close = () => ($("#howto").hidden = true);
    if (onStart) {
      const skip = el("label", "toggle ht-skip");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      skip.append(cb, el("span", null, "Don't show this again"));
      const go = el("button", "btn primary", "Let's go ▶");
      go.addEventListener("click", () => {
        if (cb.checked) store.set("howtoSkip." + kind, true);
        close();
        onStart();
      });
      acts.append(go);
      box.append(acts, skip);
      setTimeout(() => go.focus(), 50);
    } else {
      const ok = el("button", "btn primary", "Got it");
      ok.addEventListener("click", close);
      acts.append(ok);
      box.append(acts);
      setTimeout(() => ok.focus(), 50);
    }
    const ov = $("#howto");
    ov.hidden = false;
    // restart the animations each time it opens
    box.classList.remove("ht-play");
    void box.offsetWidth;
    box.classList.add("ht-play");
    ov.onclick = (e) => e.target === ov && !onStart && close();
  }

  // "Which game?" chooser (Infinite mode and Play with friends both offer Longshot or Warpath)
  function choose(title, options) {
    const dlg = $("#chooseDlg");
    $("#chooseTitle").textContent = title;
    const list = $("#chooseList");
    list.replaceChildren();
    for (const o of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choose-opt" + (o.war ? " war" : "");
      const ico = document.createElement("i");
      ico.textContent = o.icon;
      const name = document.createElement("b");
      name.textContent = o.name;
      const desc = document.createElement("span");
      desc.textContent = o.desc;
      b.append(ico, name, desc);
      b.addEventListener("click", () => {
        dlg.close();
        o.go();
      });
      list.append(b);
    }
    dlg.showModal();
  }
  const openWarpath = (opts) => window.WarpathUI && window.WarpathUI.open(opts);
  $("#playInfinite").addEventListener("click", chooseInfinite);
  $("#dropBtn").addEventListener("click", () => (S.mode === "multi" ? mpDrop() : drop()));
  $("#playFriends").addEventListener("click", () => navigate(() => showLobby()));
  $("#mpWarpath").addEventListener("click", () => openWarpath({ room: true }));
  $("#playPeople").addEventListener("click", choosePeople);
  $("#guessForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    submitGuess($("#guessInput").value);
  });
  $("#passBtn").addEventListener("click", () => submitGuess(""));
  $("#hintBtn").addEventListener("click", useHint);

  let resizeId = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeId);
    resizeId = setTimeout(layout, 150);
  });

  applyTheme();
  layout();
  showHome();
  // invite link (?room=CODE): rejoin if this tab was already in it, else open the join screen
  const inviteCode = new URLSearchParams(location.search).get("room");
  if (inviteCode && canMulti) {
    const saved = mpLoadCreds();
    if (saved && saved.code === inviteCode.toUpperCase()) {
      MP.creds = saved;
      showLobby();
      $("#mpStatus").textContent = "Reconnecting…";
      mpConnect(() => mpSend({ t: "rejoin", ...MP.creds }));
    } else showLobby(inviteCode);
  }
  if (!store.get("welcomed", false) && !inviteCode) {
    store.set("welcomed", true);
    showHowTo("countries");
  }
})();
