import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.svg",
        "icons.svg",
      ],

      manifest: {
        name: "Tiny Titans Hoggy Companion",
        short_name: "Tiny Titans",

        description:
          "Western Hognose snake tracking, genetics and husbandry companion app.",

        theme_color: "#140022",
        background_color: "#140022",

        display: "standalone",
        orientation: "portrait",

        start_url: "/",
        scope: "/",

        icons: [
          {
            src: "/favicon.svg",
            sizes: "48x46",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",

        // The interactive 3D globe adds a large client bundle. Keep it in the
        // PWA precache so installed/mobile builds do not omit the application
        // shell after introducing the globe renderer.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}",
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
});
