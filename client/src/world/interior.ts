import Phaser from "phaser";
import { tipAdi, type Door } from "./doors";

const TILE = 16;
const ROOM_W = 12; // karo
const ROOM_H = 9;

// W3: iç mekan = AYNI SAHNEDE katman (sahne geçişi YOK — ağ bağlantısı açık kalır).
// Dünya simüle edilmeye devam eder; oyuncu gövdesi kapıda sabitlenir (diğerleri
// onu kapıda dururken görür). Oda kapının kuzeyine çizilir, çıkış minderi kapıdadır.
export class Interior {
  private backdrop: Phaser.GameObjects.Rectangle | null = null;
  private room: Phaser.GameObjects.Container | null = null;
  private resizeFn: (() => void) | null = null;

  enter(scene: Phaser.Scene, door: Door): void {
    const cam = scene.cameras.main;
    const w = cam.width / cam.zoom + 64;
    const h = cam.height / cam.zoom + 64;
    this.backdrop = scene.add
      .rectangle(door.x, door.y, w, h, 0x000000)
      .setDepth(1000);
    this.resizeFn = () => {
      if (this.backdrop) {
        this.backdrop.setSize(cam.width / cam.zoom + 64, cam.height / cam.zoom + 64);
        this.backdrop.setPosition(door.x, door.y);
      }
    };
    scene.scale.on("resize", this.resizeFn);

    // oda: kapinin kuzeyine uzanan 12x9 karo (cikis minderi kapida, guney kenar)
    const room = scene.add.container(door.x, door.y).setDepth(1001);
    const g = scene.add.graphics();
    const x0 = -(ROOM_W / 2) * TILE;
    const y0 = -ROOM_H * TILE;
    // zemin (damali)
    for (let r = 0; r < ROOM_H; r++) {
      for (let c = 0; c < ROOM_W; c++) {
        g.fillStyle((r + c) % 2 === 0 ? 0x444444 : 0x383838, 1);
        g.fillRect(x0 + c * TILE, y0 + r * TILE, TILE, TILE);
      }
    }
    // duvarlar
    g.lineStyle(4, 0x222222, 1);
    g.strokeRect(x0, y0, ROOM_W * TILE, ROOM_H * TILE);
    // cikis minderi (kapida)
    g.fillStyle(0x8a5a2b, 1);
    g.fillRect(-16, -4, 32, 8);
    g.lineStyle(1, 0x111111, 1);
    g.strokeRect(-16, -4, 32, 8);
    room.add(g);

    const baslik = scene.add
      .text(door.x, door.y - ROOM_H * TILE - 10, door.baslik, {
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);
    room.add(baslik);
    // tür satırı: odanın içinde, üst duvarın altında
    const tip = tipAdi(door.tip);
    if (tip) {
      const tipText = scene.add
        .text(door.x, door.y - ROOM_H * TILE + 12, tip, {
          fontSize: "12px",
          color: "#cccccc",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0);
      room.add(tipText);
    }
    this.room = room;

    cam.centerOn(door.x, door.y);
  }

  exit(scene: Phaser.Scene): void {
    this.backdrop?.destroy();
    this.room?.destroy();
    this.backdrop = null;
    this.room = null;
    if (this.resizeFn) {
      scene.scale.off("resize", this.resizeFn);
      this.resizeFn = null;
    }
  }

  get active(): boolean {
    return this.room !== null;
  }
}
