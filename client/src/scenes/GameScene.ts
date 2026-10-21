import Phaser from "phaser";
import { CAM_LERP, SPAWN, VIEW_H, WORLD_H, WORLD_W, WS_URL } from "../config";
import type { ServerMsg } from "../../../shared/protocol";
import { addCollisions } from "../world/Collisions";
import { LocalPlayer } from "../world/LocalPlayer";
import { Minimap } from "../ui/minimap";
import { getIdentity, promptNickname } from "../ui/nickname";
import { Net } from "../net/ws";
import { RemotePlayers } from "../net/RemotePlayers";
import { Social } from "../ui/social";
import { Gps, GpsState } from "../gps";
import { Kalibrasyon } from "../ui/kalibrasyon";
import { Door, loadDoors, nearestDoor } from "../world/doors";
import { Interior } from "../world/interior";

export class GameScene extends Phaser.Scene {
  private player!: LocalPlayer;
  private minimap!: Minimap;
  private remotes!: RemotePlayers;
  private net!: Net;
  private social!: Social;
  private gps!: Gps;
  private gpsMode: GpsState = "off";
  private debugG: Phaser.GameObjects.Graphics | null = null;
  private kalib: Kalibrasyon | null = null;
  private doors: Door[] = [];
  private interior = new Interior();
  private doorPromptEl!: HTMLElement;
  private exitBtnEl!: HTMLElement;
  private nearDoor: Door | null = null;
  private myId = "";
  private myName = "";
  private lastSend = 0;
  private lastSent = { x: 0, y: 0 };

  constructor() {
    super("game");
  }

  preload() {
    this.load.image("map", "assets/harita_zemin_b.png");
    this.load.json("binalar", "assets/binalar.json");
    this.load.json("doors", "assets/kapilar_genis.json");
  }

  create() {
    const map = this.add.image(0, 0, "map").setOrigin(0, 0);
    addCollisions(this);

    // Yer tutucu dokular: kırmızı = yerel, açık = uzak (tint ile renklenecek).
    // DİKKAT: Graphics.generateTexture create() içinde (ilk render öncesi) GL'ye
    // yüklenmez — dokular ekranda çizilmez. createCanvas + refresh kanıtlı yöntemdir.
    // F2b: 2 karelik yürüme döngüsü — idle (bacaklar bitişik) + walk (bacaklar açık).
    if (!this.textures.exists("player")) {
      const make = (key: string, body: string, walk: boolean) => {
        const t = this.textures.createCanvas(key, 16, 24);
        if (!t) return;
        const c = t.getContext();
        c.fillStyle = body;
        if (walk) {
          c.fillRect(1, 1, 14, 18); // gövde (kısa)
          c.fillRect(3, 19, 4, 4); // sol bacak
          c.fillRect(9, 19, 4, 4); // sağ bacak
        } else {
          c.fillRect(1, 1, 14, 22); // gövde
        }
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
      make("player", "#e04040", false);
      make("player_walk", "#e04040", true);
      make("player_w", "#f0f0f0", false);
      make("player_wwalk", "#f0f0f0", true);
    }

    this.player = new LocalPlayer(this);
    this.minimap = new Minimap();
    this.doors = loadDoors(this);
    this.doorPromptEl = document.getElementById("door-prompt")!;
    this.exitBtnEl = document.getElementById("exit-btn")!;
    this.doorPromptEl.addEventListener("click", () => {
      if (this.nearDoor) this.enterInterior(this.nearDoor);
    });
    this.exitBtnEl.addEventListener("click", () => this.exitInterior());

    // Tıkla-yürü: HARİTA görseline bağlı — uzak oyuncuya tıklamak yürüyüş başlatmaz,
    // o tıklamayı sprite'ın kendi interaktif alanı (oyuncu kartı) yakalar.
    map.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, WORLD_W, WORLD_H),
      Phaser.Geom.Rectangle.Contains
    );
    map.on("pointerdown", (p: Phaser.Input.Pointer) => {
      // Phaser 3.60+ input'u pencere seviyesinde dinler: DOM UI üzerindeki tıklamalar da
      // buraya düşer (popover butonları dahil). Yalnızca canvas'tan gelenleri işle —
      // yoksa kart, buton tıklamasının ortasında kapanır ve buton hiç çalışmaz.
      const t = (p.event as PointerEvent | undefined)?.target as Node | undefined;
      if (t && t !== this.game.canvas && !this.game.canvas.contains(t)) return;
      if (this.interior.active) return; // iç mekanda dünya tıklaması kapalı
      this.social.closePopover();
      if (this.gpsMode === "inside") return; // GPS modunda elle yürüyüş kapalı
      this.player.setTargetWithPath(p.worldX, p.worldY); // F2c: A* ile dolan
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.centerOn(SPAWN.x, SPAWN.y);

    const applyZoom = () => cam.setZoom(Math.max(1, this.scale.height / VIEW_H));
    applyZoom();
    this.scale.on("resize", applyZoom);

    if (new URLSearchParams(location.search).has("debug")) {
      this.matter.world.createDebugGraphic();
      this.debugG = this.add.graphics().setDepth(60); // F2c: yol çizimi
    }

    // Login'siz kimlik: varsa takma adla başla, yoksa önce sor
    const { id, name } = getIdentity();
    this.myId = id;

    // F2a: sayac + oyuncu karti + emoji balonu
    this.social = new Social(
      this,
      this.myId,
      (to, e) => {
        if (this.gpsMode === "outside") return; // seyirci: tepki kapalı (mesajlaşma yok)
        this.net?.send({ t: "react", to, e });
      },
      (pid) => (pid === this.myId ? this.player.sprite : (this.remotes?.spriteOf(pid) ?? null))
    );
    this.social.setCount(1);

    // W1: ?kalibrasyon=1 → canlı nudge paneli (GPS ofseti, localStorage)
    if (new URLSearchParams(location.search).has("kalibrasyon")) {
      this.kalib = new Kalibrasyon(
        () => {
          // ofset değişince son GPS konumunu yeni ofsetle anında yeniden uygula;
          // kalibrasyonda karakter IŞINLANIR (küçük adımlar STOP_DIST'e takılır)
          const p = this.gps?.eval();
          if (p && p.inside && this.gpsMode === "inside") this.teleport(p.x, p.y);
        },
        () => ({ x: this.player.body.position.x, y: this.player.body.position.y })
      );
    }

    // G1: GPS modu — buton aç/kapat; içerideysen gerçek konumda yürü, dışarıdaysan seyirci
    const gpsBtn = document.getElementById("gps-btn")!;
    this.gps = new Gps();
    this.gps.onState = (s) => {
      this.gpsMode = s;
      if (s === "inside") {
        gpsBtn.textContent = "📍 İçeridesin (kapat)";
      } else if (s === "outside") {
        gpsBtn.textContent = "📍 Dışarıdasın — seyirci (kapat)";
      } else if (s === "error") {
        gpsBtn.textContent = "📍 Konum izni yok";
      } else {
        gpsBtn.textContent = "📍 Konumumu aç";
      }
    };
    let gpsPrevInside = false;
    this.gps.onFix = (x, y, inside) => {
      if (this.interior.active) return; // iç mekandayken GPS konum uygulama
      if (inside) {
        if (this.player.sprite.visible === false) this.player.sprite.setVisible(true);
        if (!gpsPrevInside) this.teleport(x, y); // ilk giriş: gerçek konumda belir
        this.player.setTarget(x, y); // sonraki güncellemeler: yumuşak takip
      } else {
        // Dışarıda: karakter yok, Gar önünde park et (başkaları nötr noktada görür)
        this.player.sprite.setVisible(false);
        this.teleport(SPAWN.x, SPAWN.y);
        const p = this.player.body.position;
        this.net?.send({ t: "move", x: p.x, y: p.y });
      }
      gpsPrevInside = inside;
    };
    gpsBtn.addEventListener("click", () => {
      if (this.gpsMode === "off" || this.gpsMode === "error") {
        this.gps.start();
      } else {
        this.gps.stop();
        this.player.sprite.setVisible(true);
        this.player.setTarget(this.player.body.position.x, this.player.body.position.y);
      }
    });
    document.addEventListener("visibilitychange", () => {
      // pil + gizlilik: sekme arka plana geçince GPS durur, görünürse geri başlar
      if (document.hidden && this.gpsMode !== "off" && this.gpsMode !== "error") {
        this.gps.stop();
        this.gpsMode = "off";
        gpsBtn.textContent = "📍 Konumumu aç";
      }
    });

    if (name) {
      this.myName = name;
      this.onReady();
    } else {
      // KRİTİK: Phaser WASD + ok tuşları + boşluğu varsayılan yakalar (preventDefault) —
      // bu karakterler takma ad girdisine hiç düşmez ("Ahmet" → "hmet"). Giriş süresince
      // yakalamayı kapat, bitince geri aç.
      this.input.keyboard!.clearCaptures();
      promptNickname((n) => {
        const K = Phaser.Input.Keyboard.KeyCodes;
        this.input.keyboard!.addCapture([K.UP, K.DOWN, K.LEFT, K.RIGHT, K.SPACE, K.W, K.A, K.S, K.D]);
        this.myName = n;
        this.onReady();
      });
    }
  }

  private enterInterior(door: Door): void {
    this.interior.enter(this, door);
    this.player.frozen = true;
    this.player.setTarget(door.x, door.y); // hedef temizliği (yürüyüş durur)
    this.nearDoor = null;
    this.doorPromptEl.hidden = true;
    this.exitBtnEl.hidden = false;
  }

  private exitInterior(): void {
    this.interior.exit(this);
    this.player.frozen = false;
    this.exitBtnEl.hidden = true;
    if (this.gpsMode === "inside") this.gps.eval(); // gerçek konuma dönüş
  }

  private teleport(x: number, y: number): void {
    const b = this.player.body;
    b.position.x = x;
    b.position.y = y;
    b.positionPrev.x = x;
    b.positionPrev.y = y;
    b.velocity.x = 0;
    b.velocity.y = 0;
  }

  private onReady(): void {
    this.remotes = new RemotePlayers(this, (id, name, t0, sx, sy) =>
      this.social.openPopover(id, name, t0, sx, sy)
    );
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
        this.social.setCount(this.remotes.size() + 1);
        break;
      case "join":
        this.remotes.add(m.p);
        this.social.setCount(this.remotes.size() + 1);
        break;
      case "move":
        this.remotes.move(m.id, m.x, m.y);
        break;
      case "react":
        this.social.showBubble(m.to, m.e);
        break;
      case "leave":
        this.remotes.remove(m.id);
        this.social.setCount(this.remotes.size() + 1);
        break;
      case "pong":
        break;
    }
  }

  override update(_time: number, delta: number) {
    this.kalib?.update();
    this.player.update(delta);
    // remotes yalnızca onReady'den sonra var (takma ad akışı öncesinde update çalışır)
    this.remotes?.update(delta);

    // W3: kapı yakınlığı + "Gir" istemi (worldView formülü!)
    if (!this.interior.active && this.gpsMode !== "outside") {
      const b = this.player.body;
      this.nearDoor = nearestDoor(this.doors, b.position.x, b.position.y);
    } else {
      this.nearDoor = null;
    }
    this.doorPromptEl.hidden = this.nearDoor === null;
    if (this.nearDoor) {
      // "Gir" yerine mekanın adı (kullanıcı isteği)
      this.doorPromptEl.textContent = "🚪 " + this.nearDoor.baslik;
      const cam0 = this.cameras.main;
      this.doorPromptEl.style.left = (this.nearDoor.x - cam0.worldView.x) * cam0.zoom + "px";
      this.doorPromptEl.style.top = (this.nearDoor.y - cam0.worldView.y) * cam0.zoom + "px";
    }

    // İç mekandayken: kamera kapıda kilitli, dünya katmanları odanın arkasında çalışır
    if (this.interior.active) return;

    // F2c: ?debug=1 ise son yolu çiz
    if (this.debugG && this.player.lastPath.length > 1) {
      this.debugG.clear();
      this.debugG.lineStyle(2, 0xffff00, 0.9);
      this.debugG.beginPath();
      for (let i = 0; i < this.player.lastPath.length; i++) {
        const p = this.player.lastPath[i]!;
        if (i === 0) this.debugG.moveTo(p.x, p.y);
        else this.debugG.lineTo(p.x, p.y);
      }
      this.debugG.strokePath();
    }

    // F2b: yerel AFK — soluk sprite + "uzakta" etiketi
    const afk = this.player.isAfk();
    this.player.sprite.setAlpha(afk ? 0.4 : 1);
    const afkEl = document.getElementById("afk-label")!;
    if (afk) {
      afkEl.hidden = false;
      const cam = this.cameras.main;
      afkEl.style.left = (this.player.sprite.x - cam.worldView.x) * cam.zoom + "px";
      afkEl.style.top = (this.player.sprite.y - 24 - cam.worldView.y) * cam.zoom + "px";
    } else {
      afkEl.hidden = true;
    }

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
