import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const tinyTitansLogo = "/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        tinyTitansLogo.replace(/^\//, ""),
      ],
      manifest: {
        id: "/",
        name: "Tiny Titans Reptile Companion",
        short_name: "Tiny Titans",
        description: "Tiny Titans Reptile Companion — species profiles, husbandry, tracking, genetics and keeper tools for reptiles.",
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
          {
            src: `${tinyTitansLogo}?v=3`,
            sizes: "any",
            type: "image/jpeg",
            purpose: "any maskable",
          },
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
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/]react(?:$|[\\/])/, 
              priority: 30,
            },
            {
              name: "firebase-vendor",
              test: /node_modules[\\/]firebase(?:$|[\\/])/, 
              priority: 20,
            },
            {
              name: "visual-vendor",
              test: /node_modules[\\/](?:three|@react-three|react-globe\.gl|recharts)(?:$|[\\/])/, 
              priority: 10,
            },
            {
              name: "other-vendor",
              test: /node_modules[\\/]/,
              priority: 0,
            },
          ],
        },
      },
    },
  },
});
