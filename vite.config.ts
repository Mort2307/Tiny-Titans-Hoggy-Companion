import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const tinyTitansLogo = "/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg";
const tinyTitansIcon = "/favicon.svg";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons.svg", tinyTitansLogo.replace(/^\//, "")],
      manifest: {
        id: "/",
        name: "Tiny Titans Hoggy Companion",
        short_name: "Tiny Titans",
        description: "Western Hognose snake tracking, genetics and husbandry companion app.",
        theme_color: "#140022",
        background_color: "#140022",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "en-GB",
        categories: ["education", "lifestyle"],
        icons: [
          { src: tinyTitansLogo, sizes: "any", type: "image/jpeg", purpose: "any" },
          { src: tinyTitansIcon, sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
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
