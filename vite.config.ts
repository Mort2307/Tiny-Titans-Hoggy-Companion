import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const tinyTitansLogo = "/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg";

/**
 * Prevent the vivarium face photograph from becoming a screen-space overlay.
 * The photo mesh is deliberately tagged in RoomObject3D; this narrowly scoped
 * transform changes only its material depth behaviour while preserving the
 * existing slot-scoped photo selection/persistence logic.
 */
const roomPhotoDepthFix: Plugin = {
  name: "tiny-titans-room-photo-depth-fix",
  enforce: "pre",
  transform(code, id) {
    const normalizedId = id.replace(/\\/g, "/");
    if (!normalizedId.endsWith("/src/components/reptile-room-3d/RoomObject3D.tsx")) return null;

    const fixed = code
      .replace(
        '<meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />',
        '<meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} depthTest={true} side={THREE.FrontSide} />',
      )
      .replace(
        '<meshBasicMaterial color="#2a302f" toneMapped={false} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />',
        '<meshBasicMaterial color="#2a302f" toneMapped={false} depthWrite={false} depthTest={true} side={THREE.FrontSide} />',
      );

    return fixed === code ? null : { code: fixed, map: null };
  },
};

export default defineConfig({
  plugins: [
    react(),
    roomPhotoDepthFix,
    VitePWA({
      registerType: "prompt",
      includeAssets: [
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
});
