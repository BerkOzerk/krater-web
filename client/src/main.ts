import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE },
  physics: {
    default: "matter",
    matter: { gravity: { x: 0, y: 0 } },
  },
  scene: [GameScene],
});
