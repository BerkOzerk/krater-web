import Phaser from "phaser";
import { M_H, SCALE } from "../config";

type CollisionData = {
  meta: unknown;
  polygons: { area_m2: number; points: [number, number][] }[];
};

// carpisma.json'daki 67 bina blokunu statik Matter poligonlarına çevirir.
// JSON noktaları: metre, SW köşeden, y YUKARI. PNG: y AŞAĞI → y_px = (M_H - y_m) * SCALE.
export function addCollisions(scene: Phaser.Scene): void {
  const data = scene.cache.json.get("collision") as CollisionData;
  for (const poly of data.polygons) {
    const verts = poly.points.map(([x, y]) => ({ x: x * SCALE, y: (M_H - y) * SCALE }));
    scene.matter.add.fromVertices(0, 0, verts, { isStatic: true, frictionStatic: 0 });
  }
}
