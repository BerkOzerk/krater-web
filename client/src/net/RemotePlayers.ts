import Phaser from "phaser";
import type { PlayerState } from "../../../shared/protocol";

type Remote = {
  sprite: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Text;
  name: string;
  t0: number; // bu oturumda ilk görüldüğü zaman (oyuncu kartı için)
  tx: number;
  ty: number;
};

type OnTap = (id: string, name: string, t0: number, screenX: number, screenY: number) => void;

// Uzak oyuncular: yalnız sprite (Matter gövdesi YOK — hayalet), düz lerp ile yumuşatma.
// Sprite'lar interaktif: tıklanınca oyuncu kartı popover'ı açılır (F2a).
export class RemotePlayers {
  private remotes = new Map<string, Remote>();

  constructor(
    private scene: Phaser.Scene,
    private onTap?: OnTap
  ) {}

  add(p: PlayerState): void {
    if (this.remotes.has(p.id)) return;
    const color = Phaser.Display.Color.HSLToColor(hash(p.id) / 360, 0.6, 0.5).color;
    const sprite = this.scene.add
      .image(p.x, p.y, "player_w")
      .setOrigin(0.5, 1)
      .setTint(color)
      .setDepth(2) // yerel oyuncu (10) ve isim etiketlerinin (4) altında
      .setInteractive({ useHandCursor: true });
    sprite.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      this.onTap?.(p.id, p.name, Date.now(), ptr.position.x, ptr.position.y);
    });
    const tag = this.scene.add
      .text(p.x, p.y - 26, p.name, {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(4);
    this.remotes.set(p.id, { sprite, tag, name: p.name, t0: Date.now(), tx: p.x, ty: p.y });
  }

  move(id: string, x: number, y: number): void {
    const r = this.remotes.get(id);
    if (r) {
      r.tx = x;
      r.ty = y;
    }
  }

  remove(id: string): void {
    const r = this.remotes.get(id);
    if (r) {
      r.sprite.destroy();
      r.tag.destroy();
      this.remotes.delete(id);
    }
  }

  reset(): void {
    for (const id of [...this.remotes.keys()]) this.remove(id);
  }

  size(): number {
    return this.remotes.size;
  }

  spriteOf(id: string): Phaser.GameObjects.Image | null {
    return this.remotes.get(id)?.sprite ?? null;
  }

  update(delta: number): void {
    const k = Math.min(1, (delta / 1000) * 10);
    for (const r of this.remotes.values()) {
      r.sprite.x += (r.tx - r.sprite.x) * k;
      r.sprite.y += (r.ty - r.sprite.y) * k;
      r.tag.setPosition(r.sprite.x, r.sprite.y - 26);
    }
  }
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
