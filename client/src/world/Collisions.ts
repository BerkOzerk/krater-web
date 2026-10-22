import Phaser from "phaser";
import { M_H, SCALE, artOff } from "../config";

type BinalarData = {
  meta: unknown;
  binalar: { id: number; layer: string; points: [number, number][]; h_m: number; walkable: boolean }[];
  su: [number, number][][];
};

// Kullanıcı kuralı (20.10): her yerde yürünür, SU HARİÇ. Çarpışma = su poligonları.
// Bina çatıları görseldir; walkable bayrağı ileride "yüksek bina engeli" için hazır bekler.
export function addCollisions(scene: Phaser.Scene): MatterJS.BodyType[] {
  const data = scene.cache.json.get("binalar") as BinalarData;
  const engeller: [number, number][][] = [...data.su];
  for (const b of data.binalar) {
    if (!b.walkable) engeller.push(b.points);
  }
  const off = artOff(); // sanat kalibrasyonu: engeller sanatla birlikte kayar
  const govdeler: MatterJS.BodyType[] = [];
  for (const poly of engeller) {
    const verts = poly.map(([x, y]) => ({ x: x * SCALE + off.x, y: (M_H - y) * SCALE + off.y }));
    const b = scene.matter.add.fromVertices(0, 0, verts, { isStatic: true, frictionStatic: 0 });
    if (b) govdeler.push(b);
  }
  return govdeler;
}
