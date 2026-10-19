# Krater

Balıkesir Akıncılar mahallesinin gerçek haritası üzerinde yürünebilen, Pokémon Crater tarzı çok oyunculu web oyunu. Login yok, hesap yok, NPC yok — saf varlık dünyası: oyuncular yürür, birbirini görür.

> **Geliştirici el kitabı:** `.cursor/rules/krater.mdc` — mimari, komutlar, kritik tuzaklar ve yol haritası orada. Kod değişikliğinden önce oku.

- **Client:** Phaser 3 + TypeScript + Vite (`client/`), Cloudflare Pages'te statik
- **Sunucu:** Cloudflare Workers + Durable Objects, WebSocket Hibernation API (`server/`) — free tier, $0
- **Harita:** Akıncılar 1/1000 planından üretilmiş GBC-palet zemin + 67 bina bloku çarpışması (`client/public/assets/`)

## Geliştirme

```bash
cd client && npm install && npm run dev        # oyun: http://localhost:5173
cd server && npm install && npm run dev        # sunucu: ws://127.0.0.1:8787/ws
```

İki kimlik testi: normal + gizli sekme (ayrı localStorage). Çarpışma debug: `http://localhost:5173/?debug=1`

## Deploy

```bash
cd server && npx wrangler login && npm run deploy        # workers.dev URL'i
cd client && npm run build && npx wrangler pages deploy dist --project-name krater-web
```

## Atıf

Harita tamamen Berk Özerk'in kendi plan verilerinden üretilmiştir (Akıncılar 1/1000 ve 1/5000 planları; DXF → piksel pipeline'ı `mapdata/`'da). OSM yol katmanı hizasızlık nedeniyle kaldırıldı (19.10.2026) — yollar planın kendi PL_YOL katmanından geliyor.

## Bilinen v1 kusurları

- Sunucu deploy'u DO'ları yeniden başlatır; hareketsiz oyuncular ilk hareketlerine kadar (0,0)'da görünür (saniyeler içinde kendini düzeltir).
- Ani ağ kopmasında hayalet oyuncu ~1–2 dk görünür kalabilir (sunucu tarama timer'ı hibernation'ı bozacağı için v1'de yok).

Oyun ileride berkozerk.com/oyunlar'a iframe ile gömülebilir (o repo kapsam dışı).
