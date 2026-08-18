import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const tinyTitansLogo = "/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg";
const tinyTitansIcon192 = "/icons/tiny-titans-192.svg";
const tinyTitansIcon512 = "/icons/tiny-titans-512.svg";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icons.svg",
        "manifest.webmanifest",
        "icons/tiny-titans-192.svg",
        "icons/tiny-titans-512.svg",
        tinyTitansLogo.replace(/^\//, ""),
      ],
      manifest: {
        id: "/",
        name: "Tiny Titans Hoggy Companion",
        short_name: "Tiny Titans",
        description: "Western Hognose snake tracking, genetics and husbandry companion app.",
        theme_color: "#140022",
        background_color: "#140022",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "en-GB",
        categories: ["education", "lifestyle"],
        icons: [
          { src: tinyTitansIcon192, sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
          { src: tinyTitansIcon512, sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
          { src: tinyTitansLogo, sizes: "any", type: "image/jpeg", purpose: "any" },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
      },
      devOptions: { enabled: false },
    }),
  ],
});
