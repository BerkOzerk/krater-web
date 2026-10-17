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

  constructor(scene: Phaser.Scene) {
    this.body = scene.matter.add.rectangle(SPAWN.x, SPAWN.y, BOX, BOX, {
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 0,
    });
    this.body.inertia = Infinity; // dönme yok

    this.sprite = scene.add.image(SPAWN.x, SPAWN.y, "player").setOrigin(0.5, 1).setDepth(2);

    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.target = { x: p.worldX, y: p.worldY };
    });

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

    this.body.velocity.x = vx;
    this.body.velocity.y = vy;
    if (vx !== 0) this.sprite.setFlipX(vx < 0);
    this.sprite.setPosition(this.body.position.x, this.body.position.y);
  }
}
