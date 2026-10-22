import { ART_KEY, NUDGE_KEY, NUDGE_STEP_M } from "../config";

// W1 kalibrasyon paneli — ⚙️ ile açılır. İki mod:
//  "Karakter": GPS nudge (cihaz başına, metre) — karakter ışınlanır.
//  "Harita":   sanat ofseti (cihaz başına, piksel) — sanat+3D+çarpışma+kapılar kayar,
//              yollar ve GPS SABİT kalır. Kullanıcı bu ofseti kopyalar, kalıcılaştırılır.
const ART_STEP_PX = 3;

export class Kalibrasyon {
  private panel: HTMLElement;
  private readEl: HTMLElement;
  private posEl: HTMLElement;
  private modeBtnK: HTMLButtonElement;
  private modeBtnH: HTMLButtonElement;
  private mode: "k" | "h" = "k";

  constructor(
    private onNudge: () => void,
    private onArt: () => void,
    private getPos: () => { x: number; y: number }
  ) {
    const panel = document.createElement("div");
    panel.id = "kalib-panel";
    panel.innerHTML = `
      <div class="k-title">Kalibrasyon</div>
      <div class="k-grid k-modes">
        <button type="button" id="k-mod-k">Karakter</button>
        <button type="button" id="k-mod-h">Harita</button>
      </div>
      <div class="k-grid">
        <span></span><button type="button" data-k="dy+">↑</button><span></span>
        <button type="button" data-k="dx-">←</button><button type="button" data-k="sifir">0</button><button type="button" data-k="dx+">→</button>
        <span></span><button type="button" data-k="dy-">↓</button><span></span>
      </div>
      <div class="k-read" id="k-read">dx=0.0 dy=0.0</div>
      <div class="k-pos" id="k-pos">px=... py=...</div>`;
    document.body.appendChild(panel);
    this.panel = panel;
    this.readEl = panel.querySelector("#k-read")!;
    this.posEl = panel.querySelector("#k-pos")!;
    this.modeBtnK = panel.querySelector("#k-mod-k")! as HTMLButtonElement;
    this.modeBtnH = panel.querySelector("#k-mod-h")! as HTMLButtonElement;
    panel.hidden = true;

    this.modeBtnK.addEventListener("click", () => {
      this.mode = "k";
      this.update();
    });
    this.modeBtnH.addEventListener("click", () => {
      this.mode = "h";
      this.update();
    });

    panel.querySelectorAll("[data-k]").forEach((b) => {
      b.addEventListener("click", () => {
        const k = (b as HTMLElement).dataset.k;
        if (this.mode === "k") {
          let d = this.nudge();
          if (k === "dx+") d.dx += NUDGE_STEP_M;
          else if (k === "dx-") d.dx -= NUDGE_STEP_M;
          else if (k === "dy+") d.dy += NUDGE_STEP_M; // ↑ = kuzey
          else if (k === "dy-") d.dy -= NUDGE_STEP_M;
          else if (k === "sifir") d = { dx: 0, dy: 0 };
          localStorage.setItem(NUDGE_KEY, JSON.stringify(d));
          this.onNudge();
        } else {
          let d = this.art();
          if (k === "dx+") d.x += ART_STEP_PX;
          else if (k === "dx-") d.x -= ART_STEP_PX;
          else if (k === "dy+") d.y -= ART_STEP_PX; // ↑ = sanat yukari (py kuculur)
          else if (k === "dy-") d.y += ART_STEP_PX;
          else if (k === "sifir") d = { x: 0, y: 0 };
          localStorage.setItem(ART_KEY, JSON.stringify(d));
          this.onArt();
        }
        this.update();
      });
    });
  }

  private nudge(): { dx: number; dy: number } {
    const d = this.oku(NUDGE_KEY);
    return { dx: d.x, dy: d.y };
  }

  private art(): { x: number; y: number } {
    return this.oku(ART_KEY);
  }

  private oku(key: string): { x: number; y: number } {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {
      /* yok say */
    }
    return { x: 0, y: 0 };
  }

  setVisible(v: boolean): void {
    this.panel.hidden = !v;
  }

  get visible(): boolean {
    return !this.panel.hidden;
  }

  update(): void {
    this.modeBtnK.style.background = this.mode === "k" ? "#2a6" : "#222";
    this.modeBtnH.style.background = this.mode === "h" ? "#2a6" : "#222";
    if (this.mode === "k") {
      const d = this.nudge();
      this.readEl.textContent = `karakter dx=${d.dx.toFixed(1)} dy=${d.dy.toFixed(1)} m`;
    } else {
      const d = this.art();
      this.readEl.textContent = `harita dx=${d.x} dy=${d.y} px`;
    }
    const p = this.getPos();
    this.posEl.textContent = `px=${p.x.toFixed(0)} py=${p.y.toFixed(0)}`;
  }
}
