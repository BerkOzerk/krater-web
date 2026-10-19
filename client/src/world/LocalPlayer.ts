import Phaser from "phaser";
import { BOX, SPAWN, SPEED, STOP_DIST } from "../config";

type Keys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
};

// Unity Player.cs davranışı: tıkla-yürü + WASD/oklar hedefi iptal eder.
// Unity'nin elle eksen-ayrımlı adımı yerine Matter hızı: sıfır sürtünmeyle duvar
// kaymasını Matter kendisi verir.
export class LocalPlayer {
  readonly body: MatterJS.BodyType;
  readonly sprite: Phaser.GameObjects.Image;
  private target: { x: number; y: number } | null = null;
  private keys: Keys;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.body = scene.matter.add.rectangle(SPAWN.x, SPAWN.y, BOX, BOX, {
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 0,
    });
    this.body.inertia = Infinity; // dönme yok

    // depth 10: uzak oyuncuların (1-2) ÜSTÜNDE — aynı spawn'da üst üste binse bile görünür
    this.sprite = scene.add.image(SPAWN.x, SPAWN.y, "player").setOrigin(0.5, 1).setDepth(10);

    const kb = scene.input.keyboard!;
    this.keys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  // Tıkla-yürü hedefi — harita görselinin pointerdown'ından çağrılır
  // (sahne seviyesi değil: uzak oyuncuya tıklamak kart açar, yürüyüş başlatmaz)
  setTarget(x: number, y: number): void {
    this.target = { x, y };
  }

  update(): void {
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (k.left.isDown || k.a.isDown) dx -= 1;
    if (k.right.isDown || k.d.isDown) dx += 1;
    if (k.up.isDown || k.w.isDown) dy -= 1;
    if (k.down.isDown || k.s.isDown) dy += 1;

    let vx = 0;
    let vy = 0;
    if (dx !== 0 || dy !== 0) {
      this.target = null;
      const n = Math.hypot(dx, dy);
      vx = (dx / n) * SPEED;
      vy = (dy / n) * SPEED;
    } else if (this.target) {
      const tx = this.target.x - this.body.position.x;
      const ty = this.target.y - this.body.position.y;
      if (tx * tx + ty * ty < STOP_DIST * STOP_DIST) {
        this.target = null;
      } else {
        const n = Math.hypot(tx, ty);
        vx = (tx / n) * SPEED;
        vy = (ty / n) * SPEED;
      }
    }

    // DİKKAT: doğrudan body.velocity ataması İŞLEMEZ — Matter'ın Body.update'i hızı
    // konum farkından (positionPrev) yeniden hesaplar ve ezer. MatterPhysics.setVelocity
    // üzerinden gitmek şart; ÜSTELİK argümanı "px/ADIM" birimindedir (adım = 1/60 sn) —
    // saniyelik hızı 60'a bölmeden geçirmek 60× hız patlaması üretir.
    const STEP = 1 / 60;
    this.scene.matter.setVelocity(this.body, vx * STEP, vy * STEP);
    if (vx !== 0) this.sprite.setFlipX(vx < 0);
    this.sprite.setPosition(this.body.position.x, this.body.position.y);
  }
}
