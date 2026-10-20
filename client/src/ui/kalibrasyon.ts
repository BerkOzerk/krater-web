import { NUDGE_KEY, NUDGE_STEP_M } from "../config";

// W1: canlı GPS kalibrasyon paneli — ?kalibrasyon=1 ile açılır.
// Ok tuşları karakteri haritada kaydırır; ofset localStorage'a (cihaz başına) yazılır.
export class Kalibrasyon {
  private readEl: HTMLElement;
  private posEl: HTMLElement;

  constructor(
    private onNudge: () => void,
    private getPos: () => { x: number; y: number }
  ) {
    const panel = document.createElement("div");
    panel.id = "kalib-panel";
    panel.innerHTML = `
      <div class="k-title">Kalibrasyon (m)</div>
      <div class="k-grid">
        <span></span><button type="button" data-k="dy+">↑</button><span></span>
        <button type="button" data-k="dx-">←</button><button type="button" data-k="sifir">0</button><button type="button" data-k="dx+">→</button>
        <span></span><button type="button" data-k="dy-">↓</button><span></span>
      </div>
      <div class="k-read" id="k-read">dx=0.0 dy=0.0</div>
      <div class="k-pos" id="k-pos">px=... py=...</div>`;
    document.body.appendChild(panel);
    this.readEl = panel.querySelector("#k-read")!;
    this.posEl = panel.querySelector("#k-pos")!;

    panel.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        const k = (b as HTMLElement).dataset.k;
        let d = this.nudge();
        if (k === "dx+") d.dx += NUDGE_STEP_M;
        else if (k === "dx-") d.dx -= NUDGE_STEP_M;
        else if (k === "dy+") d.dy += NUDGE_STEP_M; // ↑ = kuzey
        else if (k === "dy-") d.dy -= NUDGE_STEP_M;
        else if (k === "sifir") d = { dx: 0, dy: 0 };
        localStorage.setItem(NUDGE_KEY, JSON.stringify(d));
        this.onNudge();
        this.update();
      });
    });
  }

  private nudge(): { dx: number; dy: number } {
    try {
      const raw = localStorage.getItem(NUDGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* yok say */
    }
    return { dx: 0, dy: 0 };
  }

  update(): void {
    const d = this.nudge();
    this.readEl.textContent = `dx=${d.dx.toFixed(1)} dy=${d.dy.toFixed(1)}`;
    const p = this.getPos();
    this.posEl.textContent = `px=${p.x.toFixed(0)} py=${p.y.toFixed(0)}`;
  }
}
