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

    // Yer tutucu dokular: kırmızı = yerel, beyaz = uzak (tint ile renklenecek)
    if (!this.textures.exists("player")) {
      const g = this.add.graphics();
      g.fillStyle(0xe04040, 1);
      g.fillRect(0, 0, 16, 24);
      g.generateTexture("player", 16, 24);
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 16, 24);
      g.generateTexture("player_w", 16, 24);
      g.destroy();
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
    this.remotes.update(delta);

    // Unity CameraFollow: lerp 8 — kamera doğrudan scroll üzerinden (Matter gövdesi GameObject değil)
    const cam = this.cameras.main;
    const k = Math.min(1, (delta / 1000) * CAM_LERP);
    const tx = this.player.body.position.x - cam.width / (2 * cam.zoom);
    const ty = this.player.body.position.y - cam.height / (2 * cam.zoom);
    cam.setScroll(
      cam.scrollX + (tx - cam.scrollX) * k,
      cam.scrollY + (ty - cam.scrollY) * k
    );

    this.minimap.update(this.player.body.position.x, this.player.body.position.y);

    // Konum yayını: >1 px ve ≥100 ms (durma anında kalan mesafeyi zorla gönder)
    const p = this.player.body.position;
    const dist = Math.abs(p.x - this.lastSent.x) + Math.abs(p.y - this.lastSent.y);
    const stopped = this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0;
    if (this.net.open && dist > 1 && (this.time.now - this.lastSend >= 100 || stopped)) {
      this.lastSend = this.time.now;
      this.lastSent = { x: p.x, y: p.y };
      this.net.send({ t: "move", x: p.x, y: p.y });
    }
  }
}
