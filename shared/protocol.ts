// Krater ağ protokolü — yalnız TİP tanımları (runtime değeri yok; import type ile kullanılır).
// Koordinatlar her zaman PNG piksel çerçevesinde: x 0..2048, y 0..1608 (y aşağı).

export type ClientMsg =
  | { t: "join"; id: string; name: string }
  | { t: "move"; x: number; y: number }
  | { t: "ping" };

export type PlayerState = { id: string; name: string; x: number; y: number };

export type ServerMsg =
  | { t: "welcome"; you: string; players: PlayerState[] }
  | { t: "join"; p: PlayerState }
  | { t: "move"; id: string; x: number; y: number }
  | { t: "leave"; id: string }
  | { t: "pong" };
