import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";


// https://vite.dev/config/
export default defineConfig({

  plugins: [

    react(),

    VitePWA({

      registerType: "autoUpdate",

      manifest: {

        name: "Tiny Titans Hoggy Companion",

        short_name: "Tiny Titans",

        description:
          "Western Hognose snake tracking, genetics and husbandry companion app.",

        theme_color: "#140022",

        background_color: "#140022",

        display: "standalone",

        icons: [

          {

            src: "/TinyTitans-Logo.JPG.jpg",

            sizes: "512x512",

            type: "image/jpeg"

          }

        ]

      }

    })

  ]

});