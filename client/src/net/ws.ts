import type { ClientMsg, ServerMsg } from "../../../shared/protocol";

type Handlers = { onOpen: () => void; onMsg: (m: ServerMsg) => void };

// WS istemcisi: üstel geri çekilmeli otomatik yeniden bağlanma + 30 sn kalp atışı
// (Cloudflare free planında 100 sn boşta kalma timeout'u vardır).
export class Net {
  private ws: WebSocket | null = null;
  private backoff = 2;
  private heartbeatId: number | undefined;

  constructor(
    private url: string,
    private handlers: Handlers
  ) {}

  connect(): void {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = 2;
      this.handlers.onOpen();
    };
    ws.onmessage = (e) => this.handlers.onMsg(JSON.parse(e.data) as ServerMsg);
    ws.onclose = () => {
      setTimeout(() => this.connect(), this.backoff * 1000);
      this.backoff = Math.min(this.backoff * 2, 10);
    };
    ws.onerror = () => ws.close();
  }

  send(m: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  get open(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  startHeartbeat(): void {
    this.heartbeatId = window.setInterval(() => this.send({ t: "ping" }), 30_000);
  }

  // iOS arka planda socket'i askıya alır; görünür olunca kapalıysa anında bağlan
  resumeOnVisible(): void {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.ws && this.ws.readyState > WebSocket.OPEN) this.connect();
    });
  }
}
