import { GPS_CAL, GPS_CAL_K, GPS_FUZZ_M, GPS_UTM_OX, GPS_UTM_OY, M_H, SCALE, WORLD_H, WORLD_W, gpsNudge } from "./config";

// WGS84 -> UTM 35N ileri dönüşümü (standart formüller; pyproj ile 3 noktada 0.00 m doğrulandı)
const A = 6378137.0;
const E2 = 0.00669437999014; // WGS84 eksantrisite karesi
const K0 = 0.9996;
const LON0 = 27; // zone 35N merkez meridyeni

function utm35n(latDeg: number, lonDeg: number): { e: number; n: number } {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const dLon = lon - (LON0 * Math.PI) / 180;
  const sin = Math.sin(lat);
  const cos = Math.cos(lat);
  const tan = Math.tan(lat);
  const N = A / Math.sqrt(1 - E2 * sin * sin);
  const T = tan * tan;
  const C = (E2 / (1 - E2)) * cos * cos;
  const Ac = cos * dLon;
  const M =
    A *
    ((1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256) * lat -
      ((3 * E2) / 8 + (3 * E2 * E2) / 32 + (45 * E2 ** 3) / 1024) * Math.sin(2 * lat) +
      ((15 * E2 * E2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * lat) -
      ((35 * E2 ** 3) / 3072) * Math.sin(6 * lat));
  const e =
    500000 +
    K0 *
      N *
      (Ac +
        ((1 - T + C) * Ac ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - (58 * E2) / (1 - E2)) * Ac ** 5) / 120);
  const n =
    K0 *
    (M +
      N *
        tan *
        ((Ac * Ac) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Ac ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - (330 * E2) / (1 - E2)) * Ac ** 6) / 720));
  return { e, n };
}

export function latLonToPx(lat: number, lon: number): { x: number; y: number } {
  const { e, n } = utm35n(lat, lon);
  // çözücüden (gps_kalibre.py) gelen GPS_CAL + ölçek K — nudge BURAYA girmez
  const xm = (e - GPS_UTM_OX) * GPS_CAL_K + GPS_CAL.dx;
  const ym = (n - GPS_UTM_OY) * GPS_CAL_K - GPS_CAL.dy;
  const x = xm * SCALE;
  const y = (M_H - ym) * SCALE;
  return { x, y };
}

// Son konum: fuzz (gizlilik) SONRA nudge (ince ayar — 1 m'lik adımlar görünür)
function sonPx(lat: number, lon: number): { x: number; y: number } {
  const p = latLonToPx(lat, lon);
  const nd = gpsNudge();
  return {
    x: fuzz(p.x) + nd.dx * SCALE,
    y: fuzz(p.y) - nd.dy * SCALE,
  };
}

export function insideArea(x: number, y: number): boolean {
  return x >= 0 && x <= WORLD_W && y >= 0 && y <= WORLD_H;
}

// Gizlilik: px'i GPS_FUZZ_M metrelik ızgaraya nicele
function fuzz(v: number): number {
  const grid = GPS_FUZZ_M * SCALE;
  return Math.round(v / grid) * grid;
}

export type GpsState = "off" | "inside" | "outside" | "error";

export class Gps {
  private watchId: number | null = null;
  private lastLat: number | null = null;
  private lastLon: number | null = null;
  onFix: ((x: number, y: number, inside: boolean) => void) | null = null;
  onState: ((s: GpsState) => void) | null = null;

  start(): void {
    if (!("geolocation" in navigator)) {
      this.onState?.("error");
      return;
    }
    navigator.geolocation.watchPosition(
      (pos) => {
        this.lastLat = pos.coords.latitude;
        this.lastLon = pos.coords.longitude;
        const p = sonPx(this.lastLat, this.lastLon);
        const inside = insideArea(p.x, p.y);
        this.onState?.(inside ? "inside" : "outside");
        this.onFix?.(p.x, p.y, inside);
      },
      () => this.onState?.("error"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }

  // Kalibrasyon nudge'ından sonra: son konumu yeni ofsetle anında yeniden uygula.
  // Noktayı DÖNDÜRÜR — arayan (kalibrasyon paneli) karakteri ışınlayabilir:
  // yürüyüş hedefi STOP_DIST altındaki küçük adımlarda hiç hareket etmez.
  eval(): { x: number; y: number; inside: boolean } | null {
    if (this.lastLat === null || this.lastLon === null) return null;
    const p = sonPx(this.lastLat, this.lastLon);
    const inside = insideArea(p.x, p.y);
    this.onFix?.(p.x, p.y, inside);
    return { x: p.x, y: p.y, inside };
  }

  stop(): void {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.onState?.("off");
  }
}
