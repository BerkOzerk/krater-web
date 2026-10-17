// İki sahte istemciyle varlık protokolünün uçtan uca testi.
// Çalıştır: sunucu açıkken (npx wrangler dev) → node test/e2e.mjs
const WS_URL = process.env.WS_URL ?? "ws://127.0.0.1:8787/ws";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function open(id) {
  const ws = new WebSocket(WS_URL);
  const msgs = [];
  ws.onmessage = (e) => msgs.push(JSON.parse(e.data));
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve({ ws, msgs, send: (m) => ws.send(JSON.stringify(m)) });
    ws.onerror = () => reject(new Error("bağlantı kurulamadı: " + id));
  });
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL: " + msg);
    process.exit(1);
  }
  console.log("ok: " + msg);
}

try {
  const a = await open("a");
  const b = await open("b");
  a.send({ t: "join", id: "a", name: "Alfa" });
  b.send({ t: "join", id: "b", name: "Beta" });
  await sleep(300);

  const bw = b.msgs.find((m) => m.t === "welcome");
  assert(bw && bw.players.some((p) => p.id === "a"), "b, a'yi welcome'da gordu");
  assert(a.msgs.some((m) => m.t === "join" && m.p.id === "b"), "a, b'nin join'ini gordu");

  a.send({ t: "move", x: 100, y: 200 });
  await sleep(200);
  assert(
    b.msgs.some((m) => m.t === "move" && m.id === "a" && m.x === 100 && m.y === 200),
    "b, a'nin hareketini gordu"
  );

  a.ws.close();
  await sleep(300);
  assert(b.msgs.some((m) => m.t === "leave" && m.id === "a"), "b, a'nin ayrilisini gordu");

  b.ws.close();
  console.log("E2E PASS");
  process.exit(0);
} catch (e) {
  console.error("FAIL: " + e.message);
  process.exit(1);
}
