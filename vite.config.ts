import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const tinyTitansBuildId = process.env.TINY_TITANS_RELEASE_ID?.trim() || `tt-${Date.now().toString(36)}`;
const tinyTitansReleasedAt = new Date().toISOString();

const tinyTitansIcon192 = "/icons/tiny-titans-192.svg";
const tinyTitansIcon512 = "/icons/tiny-titans-512.svg";
const tinyTitansRasterIcon = "/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg";

export default defineConfig({
  define: { __TINY_TITANS_BUILD_ID__: JSON.stringify(tinyTitansBuildId) },
  plugins: [
    react(),
    {
      name: "tiny-titans-release-manifest",
      apply: "build",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "release.json",
          source: JSON.stringify({ buildId: tinyTitansBuildId, releasedAt: tinyTitansReleasedAt, mandatory: true }),
        });
      },
    },
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.svg",
        tinyTitansIcon192.replace(/^\//, ""),
        tinyTitansIcon512.replace(/^\//, ""),
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
            src: tinyTitansIcon192,
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: tinyTitansIcon512,
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: tinyTitansIcon512,
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
          {
            src: tinyTitansRasterIcon,
            sizes: "any",
            type: "image/jpeg",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "My Animals",
            short_name: "Animals",
            description: "Open your Tiny Titans animal collection.",
            url: "/animals",
            icons: [{ src: tinyTitansIcon192, sizes: "192x192", type: "image/svg+xml" }],
          },
          {
            name: "Due",
            short_name: "Due",
            description: "Open Tiny Titans reminders and due care.",
            url: "/reminders",
            icons: [{ src: tinyTitansIcon192, sizes: "192x192", type: "image/svg+xml" }],
          },
          {
            name: "Genetics",
            short_name: "Genetics",
            description: "Open the Tiny Titans genetics calculator.",
            url: "/calculator",
            icons: [{ src: tinyTitansIcon192, sizes: "192x192", type: "image/svg+xml" }],
          },
        ],
      },
      workbox: {
        // Bridge legacy prompt-only installations to the newest shell at the
        // next navigation without forcibly reloading an active keeper form.
        skipWaiting: true,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        // Never let the PWA app shell intercept server-owned integration routes.
        // These must reach Firebase Hosting/Functions directly for ChatGPT OAuth/MCP.
        navigateFallbackDenylist: [
          /^\/mcp(?:\/|$)/,
          /^\/oauth(?:\/|$)/,
          /^\/\.well-known\/oauth-(?:protected-resource|authorization-server)(?:\/|$)/,
          /^\/\.well-known\/openai-apps-challenge(?:\/|$)/,
          /^\/api(?:\/|$)/,
        ],
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
