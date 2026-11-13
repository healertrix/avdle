// Longshot server: serves the game and runs head-to-head rooms over WebSockets.
//
//   npm start            -> http://localhost:8787
//   PORT=9000 npm start  -> another port
//
// The server owns each room's game: it draws the prompts and judges every pick with the same engine the browser uses, so players
// can't see answers early or fake their scores.
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { WebSocketServer } = require("ws");
const hub = require("./rooms.js"); // the game logic, shared with the Cloudflare Worker
const kbcHub = require("./kbc-rooms.js"); // Crorepati two-player rooms

const PORT = Number(process.env.PORT) || 8787;
const ROOT = path.join(__dirname, "..");

// ---------------------------------------------------------------------
// Static files (only the folders the game needs, nothing else)
// ---------------------------------------------------------------------
const PUBLIC = ["index.html", "sw.js", "manifest.webmanifest", "css/", "js/", "data/", "vendor/", "icons/"];
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const cache = new Map();

function serveStatic(req, res) {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  } catch {
    rel = "";
  }
  if (rel === "") rel = "index.html";
  const full = path.normalize(path.join(ROOT, rel));
  const relNorm = path.relative(ROOT, full).split(path.sep).join("/");
  const allowed = !relNorm.startsWith("..") && PUBLIC.some((p) => (p.endsWith("/") ? relNorm.startsWith(p) : relNorm === p));
  if (!allowed || (req.method !== "GET" && req.method !== "HEAD")) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not found");
  }
  // Always revalidate (ETag), so a browser or Cloudflare never mixes an old
  // app.js with a new index.html after an update. Unchanged files get a 304.
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    const key = `${full}:${st.mtimeMs}:${st.size}`;
    const hit = cache.get(full);
    const respond = (entry) => {
      const headers = {
        "Content-Type": TYPES[path.extname(full)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        ETag: entry.etag,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
      };
      if (req.headers["if-none-match"] === entry.etag) {
        res.writeHead(304, headers);
        return res.end();
      }
      res.writeHead(200, headers);
      res.end(req.method === "HEAD" ? undefined : entry.buf);
    };
    if (hit && hit.key === key) return respond(hit);
    fs.readFile(full, (err2, buf) => {
      if (err2) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("Not found");
      }
      const entry = { key, buf, etag: `"${crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16)}"` };
      cache.set(full, entry);
      respond(entry);
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end(`ok ${hub.stats().rooms} rooms`);
  }
  serveStatic(req, res);
});

// ---------------------------------------------------------------------
// Rooms over WebSockets (the game logic is in rooms.js)
// ---------------------------------------------------------------------
// /ws is Avdle's rooms; /ws-kbc is Crorepati's two-player rooms.
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
const kbcWss = new WebSocketServer({ noServer: true, maxPayload: 25000 });
server.on("upgrade", (req, socket, head) => {
  let p = "";
  try {
    p = new URL(req.url, "http://x").pathname;
  } catch {}
  const target = p === "/ws" ? wss : p === "/ws-kbc" ? kbcWss : null;
  if (!target) return socket.destroy();
  target.handleUpgrade(req, socket, head, (ws) => target.emit("connection", ws, req));
});
const wire = (server2, h) =>
  server2.on("connection", (ws) => {
    const c = h.connect(ws);
    ws.on("message", (raw) => c.message(raw.toString()));
    ws.on("close", c.close);
  });
wire(wss, hub);
wire(kbcWss, kbcHub);
setInterval(hub.sweep, 60_000).unref();
setInterval(kbcHub.sweep, 60_000).unref();

// Keep connections alive through proxies/tunnels.
setInterval(() => {
  for (const ws of [...wss.clients, ...kbcWss.clients]) if (ws.readyState === 1) ws.ping();
}, 25_000).unref();

server.listen(PORT, () => {
  const st = hub.stats();
  console.log(`Avdle running at http://localhost:${PORT}  (${st.prompts} prompts, ${st.people} people, ${st.moments} Warpath moments)`);
});
