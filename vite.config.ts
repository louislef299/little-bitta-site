import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: "./env",
  plugins: [sveltekit()],
  server: {
    host: "0.0.0.0",
  },
});
