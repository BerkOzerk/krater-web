import Phaser from "phaser";
import { M_H, SCALE, WORLD_H, WORLD_W, artOff } from "../config";

// F2c: A* yol bulma — carpisma.json poligonlarından engel ızgarası kurulur.
// Bağımlılık yok; harita küçük olduğu için basit A* (lineer open-list taraması) yeterli.

export const CELL = 8; // px — ~3 m
const COLS = Math.ceil(WORLD_W / CELL);
const ROWS = Math.ceil(WORLD_H / CELL);

type Pt = { x: number; y: number };

let blocked: Uint8Array | null = null;
let builtFor = "";

function pointInPoly(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  let j = pts.length - 1;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i]!.y > y !== pts[j]!.y > y && x < ((pts[j]!.x - pts[i]!.x) * (y - pts[i]!.y)) / (pts[j]!.y - pts[i]!.y) + pts[i]!.x) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

function buildGrid(scene: Phaser.Scene): Uint8Array {
  // W2: engeller artık binalar.json'dan — su poligonları + yürünmez binalar
  const data = scene.cache.json.get("binalar") as {
    binalar: { points: [number, number][]; walkable: boolean }[];
    su: [number, number][][];
  };
  const engeller: [number, number][][] = [...data.su];
  for (const b of data.binalar) {
    if (!b.walkable) engeller.push(b.points);
  }
  const off = artOff(); // sanat kalibrasyonu
  const grid = new Uint8Array(COLS * ROWS);
  for (const poly of engeller) {
    const pts: Pt[] = poly.map(([x, y]) => ({ x: x * SCALE + off.x, y: (M_H - y) * SCALE + off.y }));
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const c0 = Math.max(0, Math.floor(minX / CELL));
    const c1 = Math.min(COLS - 1, Math.floor(maxX / CELL));
    const r0 = Math.max(0, Math.floor(minY / CELL));
    const r1 = Math.min(ROWS - 1, Math.floor(maxY / CELL));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (grid[r * COLS + c]) continue;
        const cx = (c + 0.5) * CELL;
        const cy = (r + 0.5) * CELL;
        if (pointInPoly(cx, cy, pts)) grid[r * COLS + c] = 1;
      }
    }
  }
  return grid;
}

function ensureGrid(scene: Phaser.Scene): Uint8Array {
  // ofset degisince izgara yeniden kurulur (cache anahtari ofseti icerir)
  const off = artOff();
  const key = `${scene.game.config.renderType}:${off.x},${off.y}`;
  if (!blocked || builtFor !== key) {
    blocked = buildGrid(scene);
    builtFor = key;
  }
  return blocked;
}

function isBlocked(grid: Uint8Array, c: number, r: number): boolean {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
  return grid[r * COLS + c] === 1;
}

function lineClear(grid: Uint8Array, x0: number, y0: number, x1: number, y1: number): boolean {
  // 4px adımlarla örnekle — hücre engeliyle kesişme yoksa görüş hattı açık
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(d / 4));
  for (let i = 1; i < steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    if (isBlocked(grid, Math.floor(x / CELL), Math.floor(y / CELL))) return false;
  }
  return true;
}

function astar(grid: Uint8Array, sx: number, sy: number, tx: number, ty: number): Pt[] | null {
  const s = { c: Math.floor(sx / CELL), r: Math.floor(sy / CELL) };
  const t = { c: Math.floor(tx / CELL), r: Math.floor(ty / CELL) };
  if (isBlocked(grid, t.c, t.r)) return null; // hedef engelde: çağıran yakın boş hücre arar

  const idx = (c: number, r: number) => r * COLS + c;
  const open: { c: number; r: number; f: number; g: number; parent: number }[] = [];
  const closed = new Uint8Array(COLS * ROWS);
  const gScore = new Float64Array(COLS * ROWS).fill(Infinity);
  const came = new Int32Array(COLS * ROWS).fill(-1);
  const startI = idx(s.c, s.r);
  gScore[startI] = 0;
  open.push({ c: s.c, r: s.r, f: Math.hypot(t.c - s.c, t.r - s.r), g: 0, parent: -1 });

  while (open.length) {
    // en düşük f'li düğümü bul (lineer tarama — bu ölçekte yeterli)
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i]!.f < open[bi]!.f) bi = i;
    const cur = open.splice(bi, 1)[0]!;
    const curI = idx(cur.c, cur.r);
    if (closed[curI]) continue;
    closed[curI] = 1;
    if (cur.c === t.c && cur.r === t.r) {
      // yolu geri sar
      const path: Pt[] = [{ x: (t.c + 0.5) * CELL, y: (t.r + 0.5) * CELL }];
      let i = curI;
      while (came[i] !== -1) {
        const prev = came[i]!;
        path.push({ x: ((prev % COLS) + 0.5) * CELL, y: (Math.floor(prev / COLS) + 0.5) * CELL });
        i = prev;
      }
      return path.reverse();
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const nc = cur.c + dc;
        const nr = cur.r + dr;
        if (isBlocked(grid, nc, nr)) continue;
        // köşe kesme: iki komşu hücre de engelse çapraz geçme
        if (dc !== 0 && dr !== 0 && (isBlocked(grid, cur.c + dc, cur.r) || isBlocked(grid, cur.c, cur.r + dr))) continue;
        const nI = idx(nc, nr);
        if (closed[nI]) continue;
        const step = dc !== 0 && dr !== 0 ? Math.SQRT2 : 1;
        const ng = cur.g + step;
        if (ng < gScore[nI]!) {
          gScore[nI] = ng;
          came[nI] = curI;
          open.push({ c: nc, r: nr, f: ng + Math.hypot(t.c - nc, t.r - nr), g: ng, parent: curI });
        }
      }
    }
  }
  return null;
}

function nearestFree(grid: Uint8Array, tx: number, ty: number): Pt | null {
  const t = { c: Math.floor(tx / CELL), r: Math.floor(ty / CELL) };
  for (let rad = 1; rad <= 12; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        if (!isBlocked(grid, t.c + dc, t.r + dr)) {
          return { x: (t.c + dc + 0.5) * CELL, y: (t.r + dr + 0.5) * CELL };
        }
      }
    }
  }
  return null;
}

export type PathInfo = { waypoints: Pt[]; final: Pt; detour: boolean };

export function findPath(scene: Phaser.Scene, x0: number, y0: number, x1: number, y1: number): PathInfo | null {
  const grid = ensureGrid(scene);
  let goal: Pt | null = { x: x1, y: y1 };
  let detour = false;
  if (isBlocked(grid, Math.floor(x1 / CELL), Math.floor(y1 / CELL))) {
    goal = nearestFree(grid, x1, y1);
    detour = true;
    if (!goal) return null;
  }
  let raw = astar(grid, x0, y0, goal.x, goal.y);
  if (!raw) return null;
  // görüş hattı kısaltması: aradaki noktaları atla
  const smoothed: Pt[] = [raw[0]!];
  for (let i = 2; i < raw.length; i++) {
    const last = smoothed[smoothed.length - 1]!;
    if (!lineClear(grid, last.x, last.y, raw[i]!.x, raw[i]!.y)) {
      smoothed.push(raw[i - 1]!);
    }
  }
  smoothed.push(raw[raw.length - 1]!);
  return { waypoints: smoothed.slice(1), final: goal, detour };
}
