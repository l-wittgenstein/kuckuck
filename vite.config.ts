import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Relative base so the build works under any GitHub Pages sub-path.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      // Ask before updating, so a new version never reloads a quiz halfway.
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Kuckuck",
        short_name: "Kuckuck",
        description: "Il tedesco, un passo alla volta.",
        lang: "it",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        // Android paints an installed app's navigation bar (and splash) with
        // these, and a manifest can't vary them for dark mode: the brand
        // green reads well under both themes. The status bar follows the
        // page's theme-color meta instead.
        background_color: "#3f6b5a",
        theme_color: "#3f6b5a",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
      },
    }),
  ],
});
