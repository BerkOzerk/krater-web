import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  // pixelArt KULLANMA: Phaser'da roundPixels=true'yu koşulsuz dayatır; preRender
  // her karede Math.floor(scroll) yapıp geri yazdığı için kamera lerp'i hedefe
  // ~7px kala kilitlenir, karakter merkezden kayar. Piksel netliği antialias=false ile gelir.
  antialias: false,
  roundPixels: false,
  scale: { mode: Phaser.Scale.RESIZE },
  physics: {
    default: "matter",
    matter: { gravity: { x: 0, y: 0 } },
  },
  scene: [GameScene],
});

// Teşhis kancası (konsoldan: __krater.scene.scenes[0].player.body.position)
(window as unknown as { __krater?: Phaser.Game }).__krater = game;
