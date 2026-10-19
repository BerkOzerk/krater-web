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
export const GPS_UTM_OX = 575867.03; // harita çerçevesi (carpisma.json orijiniyle aynı)
export const GPS_UTM_OY = 4388840.62;
export const GPS_CAL = { dx: 0, dy: 0 }; // görsel kalibrasyon (metre; kullanıcı doğrularsa ayarlanır)

export const AFK_MS = 30_000; // bu kadar hareketsizlik = uzakta (F2b)
export const WALK_ANIM_MS = 200; // 2 karelik yürüme döngüsü periyodu
