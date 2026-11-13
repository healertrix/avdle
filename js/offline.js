// Offline play: one tap in Settings saves every page, script and question bank on this device.
// The service worker (sw.js) does the saving; this file wires up the Settings button.
(function () {
  "use strict";
  const btn = document.getElementById("offlineBtn");
  const note = document.getElementById("offlineNote");
  if (!btn || !note) return;
  if (!("serviceWorker" in navigator) || !window.caches) {
    btn.disabled = true;
    note.textContent = "This browser can't save the game for offline play.";
    return;
  }

  let state = "off";
  const show = (s, text) => {
    state = s;
    btn.disabled = s === "busy";
    btn.textContent = s === "ready" ? "Remove offline copy" : s === "busy" ? "Downloading…" : "Download for offline play";
    note.textContent = text;
  };
  const OFF_TEXT = "Saves every question (map, people, Warpath, Crorepati) on this device, about 4 MB. Rooms and Wikipedia summaries still need the internet.";
  show("off", OFF_TEXT);

  // every file the page loads, read from the page itself so new files are never missed
  const files = () => {
    const list = ["/"];
    document.querySelectorAll("script[src], link[rel=stylesheet][href]").forEach((el) => {
      const u = new URL(el.getAttribute("src") || el.getAttribute("href"), location.href);
      if (u.origin === location.origin) list.push(u.pathname + u.search);
    });
    return list;
  };

  const ready = navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready);
  const send = (msg) => ready.then((reg) => reg.active && reg.active.postMessage(msg));

  navigator.serviceWorker.addEventListener("message", (e) => {
    const m = e.data || {};
    if (m.type === "progress") show("busy", `Saving ${m.done} of ${m.total} files…`);
    else if (m.type === "ready") show("ready", "Saved on this device. Every solo game now works without internet, and new questions are picked up whenever you're online.");
    else if (m.type === "failed") show("off", `${m.failed} file(s) didn't download. Check your connection and try again.`);
    else if (m.type === "removed" || m.type === "off") show("off", OFF_TEXT);
  });

  send({ type: "status" });
  // the menu's "Play offline" opens Settings; bring the download button into view
  document.querySelectorAll("[data-offline]").forEach((m) =>
    m.addEventListener("click", () =>
      setTimeout(() => {
        btn.scrollIntoView({ block: "center" });
        btn.focus({ preventScroll: true });
      }, 60)
    )
  );
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (state === "ready") send({ type: "remove" });
    else {
      show("busy", "Starting download…");
      send({ type: "download", urls: files() });
    }
  });
})();
