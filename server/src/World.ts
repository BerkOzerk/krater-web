import type { ClientMsg, PlayerState, ServerMsg } from "../../shared/protocol";

// Hibernation-güvenli varlık odası. Kural: timer YOK, fetch YOK, storage YOK —
// bunlar hibernation'ı bloklar ve faturalandırır. Socket başına durum yalnızca
// attachment'ta yaşar (join + her move'da yeniden serileşir).
export class World {
  ctx: DurableObjectState;
  // Bellek içi hız sınırı; hibernation'da sıfırlanır (boş socket zaten sel göndermez).
  private rates = new Map<WebSocket, { t: number; n: number }>();

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, ["p"]);
    server.serializeAttachment({ id: "", name: "", x: 0, y: 0 });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string) {
    let m: ClientMsg;
    try {
      m = JSON.parse(raw);
    } catch {
      ws.close(4000, "bad json");
      return;
    }

    const now = Date.now();
    const r = this.rates.get(ws) ?? { t: now, n: 0 };
    if (now - r.t > 1000) {
      r.t = now;
      r.n = 0;
    }
    if (++r.n > 50) return; // saniyede 50 mesaj üstü: sessizce düşür
    this.rates.set(ws, r);

    const a = ws.deserializeAttachment() as PlayerState;

    switch (m.t) {
      case "join": {
        // Rejoin dedupe: aynı id'nin eski socket'i ölürse hayalet çift kalmaz
        for (const s of this.ctx.getWebSockets("p")) {
          if (s !== ws && (s.deserializeAttachment() as PlayerState).id === m.id) {
            s.close(4001, "rejoined");
          }
        }
        const p: PlayerState = { id: m.id, name: m.name.slice(0, 24), x: 0, y: 0 };
        ws.serializeAttachment(p);
        this.broadcast({ t: "join", p }, ws);
        const others = this.ctx
          .getWebSockets("p")
          .filter((s) => s !== ws)
          .map((s) => s.deserializeAttachment() as PlayerState)
          .filter((pl) => pl.id);
        ws.send(JSON.stringify({ t: "welcome", you: m.id, players: others } satisfies ServerMsg));
        break;
      }
      case "move": {
        if (!a.id) return; // join öncesi move yok sayılır
        ws.serializeAttachment({
          ...a,
          x: Math.min(2048, Math.max(0, m.x)),
          y: Math.min(1608, Math.max(0, m.y)),
        });
        this.broadcast({ t: "move", id: a.id, x: m.x, y: m.y }, ws);
        break;
      }
      case "ping":
        ws.send(JSON.stringify({ t: "pong" } satisfies ServerMsg));
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.rates.delete(ws);
    const a = ws.deserializeAttachment() as PlayerState;
    if (!a.id) return;
    // Rejoin yarışı: aynı id'li canlı socket varsa leave yayınlama
    if (
      this.ctx
        .getWebSockets("p")
        .some((s) => s !== ws && (s.deserializeAttachment() as PlayerState).id === a.id)
    ) {
      return;
    }
    this.broadcast({ t: "leave", id: a.id });
  }

  private broadcast(m: ServerMsg, except?: WebSocket) {
    const s = JSON.stringify(m);
    for (const w of this.ctx.getWebSockets("p")) if (w !== except) w.send(s);
  }
}
