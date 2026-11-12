// Avdle on Cloudflare: static files come from Workers Assets, and multiplayer rooms live in one
// Durable Object (so every player's WebSocket reaches the same rooms). The game logic is the same
// file the Node server uses: server/rooms.js.
import hub from "../server/rooms.js";

export class Rooms {
  constructor(ctx, env) {
    this.ctx = ctx;
    // clear out rooms nobody has been in for 15 minutes
    setInterval(() => hub.sweep(), 60_000);
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const conn = hub.connect(server);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      conn.close();
    };
    server.addEventListener("message", (e) => conn.message(typeof e.data === "string" ? e.data : ""));
    server.addEventListener("close", close);
    server.addEventListener("error", close);
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") return env.ROOMS.get(env.ROOMS.idFromName("avdle-rooms")).fetch(request);
    if (url.pathname === "/healthz") return new Response("ok", { headers: { "Content-Type": "text/plain" } });
    // everything else is a static file (index.html, css/, js/, data/, vendor/)
    return env.ASSETS.fetch(request);
  },
};
