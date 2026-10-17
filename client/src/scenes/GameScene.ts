import Phaser from "phaser";
import { CAM_LERP, SPAWN, VIEW_H, WORLD_H, WORLD_W, WS_URL } from "../config";
import type { ServerMsg } from "../../../shared/protocol";
import { addCollisions } from "../world/Collisions";
import { LocalPlayer } from "../world/LocalPlayer";
import { Minimap } from "../ui/minimap";
import { getIdentity, promptNickname } from "../ui/nickname";
import { Net } from "../net/ws";
import { RemotePlayers } from "../net/RemotePlayers";

export class GameScene extends Phaser.Scene {
  private player!: LocalPlayer;
  private minimap!: Minimap;
  private remotes!: RemotePlayers;
  private net!: Net;
  private myId = "";
  private myName = "";
  private lastSend = 0;
  private lastSent = { x: 0, y: 0 };

  constructor() {
    super("game");
  }

  preload() {
    this.load.image("map", "assets/harita_zemin_gb.png");
    this.load.json("collision", "assets/carpisma.json");
  }

  create() {
    this.add.image(0, 0, "map").setOrigin(0, 0);
    addCollisions(this);

    // Yer tutucu dokular: kırmızı = yerel, açık = uzak (tint ile renklenecek).
    // DİKKAT: Graphics.generateTexture create() içinde (ilk render öncesi) GL'ye
    // yüklenmez — dokular ekranda çizilmez. createCanvas + refresh kanıtlı yöntemdir.
    if (!this.textures.exists("player")) {
      const make = (key: string, body: string) => {
        const t = this.textures.createCanvas(key, 16, 24);
        if (!t) return;
        const c = t.getContext();
        c.fillStyle = body;
        c.fillRect(1, 1, 14, 22); // gövde
        c.fillStyle = "#222222"; // kontur
        c.fillRect(0, 0, 16, 2);
        c.fillRect(0, 22, 16, 2);
        c.fillRect(0, 2, 1, 20);
        c.fillRect(15, 2, 1, 20);
        c.fillStyle = "#ffffff"; // gözler
        c.fillRect(4, 6, 3, 3);
        c.fillRect(9, 6, 3, 3);
        t.refresh();
      };
      make("player", "#e04040");
      make("player_w", "#f0f0f0");
    }

    this.player = new LocalPlayer(this);
    this.minimap = new Minimap();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.centerOn(SPAWN.x, SPAWN.y);

    const applyZoom = () => cam.setZoom(Math.max(1, this.scale.height / VIEW_H));
    applyZoom();
    this.scale.on("resize", applyZoom);

    if (new URLSearchParams(location.search).has("debug")) {
      this.matter.world.createDebugGraphic();
    }

    // Login'siz kimlik: varsa takma adla başla, yoksa önce sor
    const { id, name } = getIdentity();
    this.myId = id;
    if (name) {
      this.myName = name;
      this.onReady();
    } else {
      promptNickname((n) => {
        this.myName = n;
        this.onReady();
      });
    }
  }

  private onReady(): void {
    this.remotes = new RemotePlayers(this);
    this.net = new Net(WS_URL, {
      onOpen: () => {
        this.net.send({ t: "join", id: this.myId, name: this.myName });
        // İlk konum da hemen gönderilsin ki uzaklar (0,0)'da görünmesin
        const p = this.player.body.position;
        this.net.send({ t: "move", x: p.x, y: p.y });
      },
      onMsg: (m) => this.onMsg(m),
    });
    this.net.connect();
    this.net.startHeartbeat();
    this.net.resumeOnVisible();
  }

  private onMsg(m: ServerMsg): void {
    switch (m.t) {
      case "welcome":
        this.remotes.reset();
        for (const p of m.players) this.remotes.add(p);
        break;
      case "join":
        this.remotes.add(m.p);
        break;
      case "move":
        this.remotes.move(m.id, m.x, m.y);
        break;
      case "leave":
        this.remotes.remove(m.id);
        break;
      case "pong":
        break;
    }
  }

  override update(_time: number, delta: number) {
    this.player.update();
    // remotes yalnızca onReady'den sonra var (takma ad akışı öncesinde update çalışır)
    this.remotes?.update(delta);

    // Unity CameraFollow: lerp 8 — kamera doğrudan scroll üzerinden (Matter gövdesi GameObject değil).
    // DİKKAT: Phaser'da scroll + width/2 = ekran merkezinin DÜNYA koordinatı (zoom'suz).
    // width/(2*zoom) yazmak kamerayı oyuncudan uzağa sürükler — karakter ekran dışına düşer.
    const cam = this.cameras.main;
    const k = Math.min(1, (delta / 1000) * CAM_LERP);
    const tx = this.player.body.position.x - cam.width / 2;
    const ty = this.player.body.position.y - cam.height / 2;
    cam.setScroll(
      cam.scrollX + (tx - cam.scrollX) * k,
      cam.scrollY + (ty - cam.scrollY) * k
    );

    this.minimap.update(this.player.body.position.x, this.player.body.position.y);

    // Konum yayını: >1 px ve ≥100 ms (durma anında kalan mesafeyi zorla gönder)
    const p = this.player.body.position;
    const dist = Math.abs(p.x - this.lastSent.x) + Math.abs(p.y - this.lastSent.y);
    const stopped = this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0;
    if (this.net?.open && dist > 1 && (this.time.now - this.lastSend >= 100 || stopped)) {
      this.lastSend = this.time.now;
      this.lastSent = { x: p.x, y: p.y };
      this.net.send({ t: "move", x: p.x, y: p.y });
    }
  }
}
