// Avdle offline play. Nothing is stored until the player taps "Download for offline play"
// in Settings; js/offline.js then sends the list of files and this worker saves them.
// After that: always try the network first (so new questions arrive), save what comes back,
// and fall back to the saved copy when there's no connection.
const CACHE = "avdle-offline";
const MARK = "/__offline-on";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function enabled(cache) {
  return !!(await cache.match(MARK));
}

self.addEventListener("message", (e) => {
  const msg = e.data || {};
  const reply = (m) => e.source && e.source.postMessage(m);
  if (msg.type === "download") {
    e.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        const urls = [...new Set(msg.urls)];
        let done = 0;
        let failed = 0;
        for (const url of urls) {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (!res.ok) throw new Error(res.status);
            await cache.put(url, res);
          } catch (_) {
            failed++;
          }
          done++;
          reply({ type: "progress", done, total: urls.length });
        }
        if (!failed) await cache.put(MARK, new Response("1"));
        reply({ type: failed ? "failed" : "ready", failed });
      })()
    );
  } else if (msg.type === "remove") {
    e.waitUntil(caches.delete(CACHE).then(() => reply({ type: "removed" })));
  } else if (msg.type === "status") {
    e.waitUntil(
      caches.open(CACHE).then(async (c) => reply({ type: (await enabled(c)) ? "ready" : "off" }))
    );
  }
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/ws")) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (!(await enabled(cache))) return fetch(req);
      const key = req.mode === "navigate" ? "/" : req;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(key, res.clone());
        return res;
      } catch (err) {
        const saved = await cache.match(key, { ignoreSearch: req.mode === "navigate" });
        if (saved) return saved;
        // a file whose ?v= changed since the download: the older copy still works
        const older = await cache.match(req, { ignoreSearch: true });
        if (older) return older;
        throw err;
      }
    })()
  );
});
