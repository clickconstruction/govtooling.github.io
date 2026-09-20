import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The site is served from the root of its own domain (govtooling.com),
// so Pages serves from the root. If this project moves to a project repo
// (e.g. `gh-pages` style), change `base` to `/<repo-name>/`.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
    rollupOptions: {
      input: {
        index: "index.html",
        dev: "dev.html",
        generator: "generator.html",
      },
    },
  },
});
