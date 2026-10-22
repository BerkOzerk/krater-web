// Bütün sihirli sayılar burada. Koordinat çerçevesi: PNG pikselleri, y aşağı, orijin sol üst.
// Kaynak: Unity MapBuilder.cs + mapdata/remap_gb.py (1 m = 2.6794 px).

export const SCALE = 2.6794; // px / metre (2048 / 764.34)
export const M_W = 764.34; // dünya genişliği (metre)
export const M_H = 600; // dünya yüksekliği (metre)
export const WORLD_W = 2048;
export const WORLD_H = 1608;

// Spawn: Balıkesir Gar önü. Unity: merkeze göre (-14.3, -194.1) m (y yukarı).
// SW köşeden: x_m = M_W/2 - 14.3, y_m = M_H/2 - 194.1 → PNG'de y = (M_H - y_m) * SCALE.
export const SPAWN = {
  x: (M_W / 2 - 14.3) * SCALE, // ≈ 985.7
  y: (M_H / 2 + 194.1) * SCALE, // ≈ 1323.9
};

// Unity: ortho size 4 → görüş yüksekliği 8 birim = 80 m (SCALE 0.1 ile 1 birim = 10 m).
export const VIEW_H = 8 * 10 * SCALE; // ≈ 214 px
export const SPEED = 1.2 * 10 * SCALE; // ≈ 32 px/s (Unity 1.2 birim/s)
export const BOX = 0.32 * 10 * SCALE; // ≈ 8.6 px çarpışma kutusu
export const STOP_DIST = 0.5 * 10 * SCALE; // ≈ 13.4 px
export const CAM_LERP = 8; // Unity CameraFollow.follow

export const WS_URL = import.meta.env.DEV
  ? "ws://127.0.0.1:8787/ws"
  : "wss://krater-server.krater-server.workers.dev/ws"; // Garproject Cloudflare hesabı

// ---- GPS modu (G1) ----
export const GPS_FUZZ_M = 10; // gizlilik: konum 10 m'lik ızgaraya nicele
// SANATIN GERÇEK ORİJİNİ (22.10 ölçümü): plan çizimi, eski meta'nın iddia ettiği
// orijinin 40 m doğusunda + 184 m kuzeyinde oturuyor. Tüm katmanlar (GPS, yollar,
// POI'ler) bu orijine göre çizilir; artık CAL yok.
export const GPS_UTM_OX = 575907.0;
export const GPS_UTM_OY = 4389025.0;
// 22.10.2026: sanatın gerçek orijini GPS_UTM_OX/OY'e taşındı — ayrıca CAL GEREKMEZ.
export const GPS_CAL = { dx: 0, dy: 0 };
export const GPS_CAL_K = 1; // ölçek düzeltmesi (varsayılan 1; çözücü anlamlı bulursa değişir)
export const NUDGE_KEY = "krater.gps.nudge"; // canlı nudge ofseti (metre; +dx=doğu, +dy=kuzey)
export const NUDGE_STEP_M = 1;

// Cihaz başına nudge (localStorage) — GPS_CAL'den AYRI: nudge fuzz'dan SONRA uygulanır
// (ince ayar 1 m'lik adımlarda görünür olsun diye; fuzz gizlilik için GPS'i kaba ızgaralar).
export function gpsNudge(): { dx: number; dy: number } {
  let d = { dx: 0, dy: 0 };
  try {
    const raw = localStorage.getItem(NUDGE_KEY);
    if (raw) d = JSON.parse(raw);
  } catch {
    /* bozuk JSON yok say */
  }
  return d;
}

export const AFK_MS = 30_000; // bu kadar hareketsizlik = uzakta (F2b)
export const ART_KEY = "krater.art.offset"; // harita sanati kalibrasyon ofseti (px, localStorage)
// 22.10.2026 kullanici saha kalibrasyonu (telefon panelinden kopyalandi):
// sanat -120 px batiya, -291 px kuzeye (yollar referans) = ~(-44.8 m, -108.6 m)
export const ART_OFF = { x: -120, y: -291 }; // kalici deger — sabitlendi

// Harita sanati ofseti: varsayilan (ART_OFF) + cihaz basina localStorage duzeltmesi.
// Yollar ve GPS SABİT kalir; yalnizca sanat + 3D + carpisma + kapilar bu ofsetle kayar.
export function artOff(): { x: number; y: number } {
  let d = { x: 0, y: 0 };
  try {
    const raw = localStorage.getItem(ART_KEY);
    if (raw) d = JSON.parse(raw);
  } catch {
    /* yok say */
  }
  return { x: ART_OFF.x + d.x, y: ART_OFF.y + d.y };
}
export const WALK_ANIM_MS = 200; // 2 karelik yürüme döngüsü periyodu
