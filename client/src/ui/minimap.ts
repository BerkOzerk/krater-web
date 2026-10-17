import { WORLD_H, WORLD_W } from "../config";

// Unity MiniMap'in DOM portu: sol-alt panel (170×134, harita 160×126) + kırmızı 8×8 işaretçi.
// Harita görseli CSS'te aynı PNG'den gelir (tarayıcı önbelleği).
export class Minimap {
  private marker: HTMLElement;

  constructor() {
    this.marker = document.getElementById("mm-marker")!;
  }

  update(x: number, y: number): void {
    this.marker.style.left = `${5 + (x / WORLD_W) * 160 - 4}px`;
    this.marker.style.top = `${4 + (y / WORLD_H) * 126 - 4}px`;
  }
}
