import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: "0.0.0.0",
  },
  ssr: {
    external: ["bun"],
  },
  build: {
    rollupOptions: {
      external: ["bun"],
    },
  },
  optimizeDeps: {
    exclude: ["bun"],
  },
});
