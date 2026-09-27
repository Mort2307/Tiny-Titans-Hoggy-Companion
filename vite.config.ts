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
        name: "Tiny Titans Keeper Companion",
        short_name: "Tiny Titans",
        description: "Tiny Titans Keeper Companion — animal records, species-aware care, genetics and keeper tools.",
        theme_color: "#140022",
        background_color: "#140022",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "any",
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
        globIgnores: ["**/three-vendor-*.js", "**/globe-vendor-*.js"],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(?:three-vendor|globe-vendor)-.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "tinytitans-visual-runtime-v1",
              expiration: { maxEntries: 8, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
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
              name: "firebase-functions",
              test: /node_modules[\\/]firebase[\\/]functions(?:$|[\\/])/,
              priority: 26,
            },
            {
              name: "firebase-vendor",
              test: /node_modules[\\/]firebase(?:$|[\\/])/,
              priority: 20,
            },
            {
              name: "three-vendor",
              test: /node_modules[\\/](?:three|@react-three)(?:$|[\\/])/,
              priority: 14,
            },
            {
              name: "globe-vendor",
              test: /node_modules[\\/]react-globe\.gl(?:$|[\\/])/,
              priority: 13,
            },
            {
              name: "charts-vendor",
              test: /node_modules[\\/]recharts(?:$|[\\/])/,
              priority: 12,
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
