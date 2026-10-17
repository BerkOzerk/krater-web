import { World } from "./World";

export { World }; // wrangler: DO sınıfları entrypoint'ten export edilmeli

export interface Env {
  WORLD: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/ws") {
      return new Response("krater-server", { headers: { "content-type": "text/plain" } });
    }
    const id = env.WORLD.idFromName("akincilar"); // tek dünya
    return env.WORLD.get(id).fetch(request);
  },
};
