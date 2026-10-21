import Phaser from "phaser";
import { M_H, SCALE, SPAWN } from "../config";

export type Door = { id: string; baslik: string; x: number; y: number };

export const DOOR_RADIUS_PX = 26; // ~10 m

// Kapılar: Gar kapısı = spawn noktası (oyuncu Gar'ın önünde doğar) + blok başına
// kapı (kapilar_genis.json: güney kenar orta noktası + imar bölgesi başlığı).
// Kullanıcı davranışı: "bir binaya giriş → o dükkanın katı" — dükkan isimleri
// sonra elle/mülki veriyle değişir.
export function loadDoors(scene: Phaser.Scene): Door[] {
  const kapilar: Door[] = [{ id: "gar", baslik: "Gar", x: SPAWN.x, y: SPAWN.y }];
  const data = scene.cache.json.get("doors") as {
    kapilar?: { blok: number; x_m: number; y_m: number; baslik?: string }[];
  };
  for (const k of data?.kapilar ?? []) {
    kapilar.push({
      id: `k${k.blok}`,
      baslik: k.baslik ?? "Bina",
      x: k.x_m * SCALE,
      y: (M_H - k.y_m) * SCALE,
    });
  }
  return kapilar;
}

export function nearestDoor(doors: Door[], x: number, y: number): Door | null {
  let best: Door | null = null;
  let bd = DOOR_RADIUS_PX;
  for (const d of doors) {
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist < bd) {
      bd = dist;
      best = d;
    }
  }
  return best;
}
