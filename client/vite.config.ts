import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 1500 },
  plugins: [VitePWA({
    registerType: "autoUpdate",
    manifest: {
      name: "Krater",
      short_name: "Krater",
      start_url: ".",
      display: "fullscreen",
      background_color: "#000000",
      theme_color: "#000000",
      icons: [
        { src: "assets/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "assets/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    workbox: { globPatterns: ["**/*.{js,css,html,png,json}"] },
  }), cloudflare()],
});