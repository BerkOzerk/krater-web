// İki sahte istemciyle varlık protokolünün uçtan uca testi.
// Yerel: npx wrangler dev açıkken → node test/e2e.mjs
// Üretim: WS_URL="wss://..." node test/e2e.mjs  (soğuk başlatma için sabırlı beklemeli)
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

async function waitFor(msgs, pred, what, timeout = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const hit = msgs.find(pred);
    if (hit) return hit;
    await sleep(100);
  }
  console.error("FAIL: " + what + " (mesajlar: " + JSON.stringify(msgs) + ")");
  process.exit(1);
}

try {
  const a = await open("a");
  const b = await open("b");
  a.send({ t: "join", id: "a", name: "Alfa" });
  b.send({ t: "join", id: "b", name: "Beta" });

  const bw = await waitFor(b.msgs, (m) => m.t === "welcome", "b welcome alamadi");
  assert(bw.players.some((p) => p.id === "a"), "b, a'yi welcome'da gordu");
  await waitFor(a.msgs, (m) => m.t === "join" && m.p.id === "b", "a, b'nin join'ini gormedi");
  assert(true, "a, b'nin join'ini gordu");

  a.send({ t: "move", x: 100, y: 200 });
  await waitFor(b.msgs, (m) => m.t === "move" && m.id === "a", "b, a'nin hareketini gormedi");
  assert(true, "b, a'nin hareketini gordu");

  a.send({ t: "react", to: "b", e: "👋" });
  await waitFor(
    b.msgs,
    (m) => m.t === "react" && m.from === "a" && m.to === "b" && m.e === "👋",
    "b, a'nin tepkisini gormedi"
  );
  assert(true, "b, a'nin tepkisini gordu");

  a.ws.close();
  await waitFor(b.msgs, (m) => m.t === "leave" && m.id === "a", "b, a'nin ayrilisini gormedi");
  assert(true, "b, a'nin ayrilisini gordu");

  b.ws.close();
  console.log("E2E PASS");
  process.exit(0);
} catch (e) {
  console.error("FAIL: " + e.message);
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL: " + msg);
    process.exit(1);
  }
  console.log("ok: " + msg);
}
