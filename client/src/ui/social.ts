import Phaser from "phaser";

type GetSprite = (id: string) => Phaser.GameObjects.Image | null;

// F2a: online sayacı + oyuncu kartı popover'ı + emoji tepki balonu — hepsi DOM tabanlı
// (Phaser Text emoji render'ına güvenilmez; DOM her yerde çalışır).
export class Social {
  private counter: HTMLElement;
  private popover: HTMLElement;
  private popName: HTMLElement;
  private popTime: HTMLElement;
  private bubble: HTMLElement;
  private bubbleTimer: number | undefined;
  private popTarget: string | null = null;

  constructor(
    private scene: Phaser.Scene,
    private myId: string,
    private onReact: (to: string, e: string) => void,
    private getSprite: GetSprite
  ) {
    this.counter = document.getElementById("online-count")!;
    this.popover = document.getElementById("popover")!;
    this.popName = document.getElementById("pop-name")!;
    this.popTime = document.getElementById("pop-time")!;
    this.bubble = document.getElementById("bubble")!;
    document.getElementById("pop-1")!.addEventListener("click", () => this.send("👋"));
    document.getElementById("pop-2")!.addEventListener("click", () => this.send("❤️"));
    document.getElementById("pop-3")!.addEventListener("click", () => this.send("😮"));
  }

  setCount(n: number): void {
    this.counter.textContent = "Şu an mahallede " + n + " kişi";
  }

  openPopover(id: string, name: string, t0: number, screenX: number, screenY: number): void {
    this.popTarget = id;
    this.popName.textContent = name;
    const mins = Math.max(1, Math.round((Date.now() - t0) / 60000));
    this.popTime.textContent = "Yaklaşık " + mins + " dk'dır burada";
    this.popover.hidden = false;
    this.popover.style.left = Math.min(screenX, window.innerWidth - 170) + "px";
    this.popover.style.top = Math.max(8, screenY - 120) + "px";
  }

  closePopover(): void {
    this.popover.hidden = true;
    this.popTarget = null;
  }

  private send(e: string): void {
    if (this.popTarget) this.onReact(this.popTarget, e);
    this.closePopover();
  }

  showBubble(id: string, e: string): void {
    const sprite = this.getSprite(id);
    if (!sprite) return;
    const cam = this.scene.cameras.main;
    // DİKKAT: ekran koordinatı için worldView (scroll değil) — scroll + width/2 dünya
    // merkezidir; worldView.x = scroll + width/2 - displayWidth/2.
    const sx = (sprite.x - cam.worldView.x) * cam.zoom;
    const sy = (sprite.y - 24 - cam.worldView.y) * cam.zoom;
    this.bubble.textContent = e;
    this.bubble.hidden = false;
    this.bubble.style.left = sx + "px";
    this.bubble.style.top = sy + "px";
    window.clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => {
      this.bubble.hidden = true;
    }, 2000);
  }
}
