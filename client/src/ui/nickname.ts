// Login'siz kimlik: localStorage'da UUID + takma ad. İlk ziyarette DOM overlay'i sorar.
export function getIdentity(): { id: string; name: string | null } {
  let id = localStorage.getItem("krater.id");
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("krater.id", id);
  }
  return { id, name: localStorage.getItem("krater.name") };
}

export function promptNickname(onSubmit: (name: string) => void): void {
  const overlay = document.getElementById("nickname-overlay")!;
  const input = document.getElementById("nickname-input") as HTMLInputElement;
  const form = document.getElementById("nickname-form") as HTMLFormElement;

  overlay.hidden = false;
  input.focus();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim().slice(0, 24) || "Misafir";
    localStorage.setItem("krater.name", v);
    overlay.hidden = true;
    onSubmit(v);
  });
}
