import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  envPrefix: ["GOOGLE_MAPS"],
  base: "./",
  resolve: {
    alias: {
      "~": __dirname,
    },
  },
});
