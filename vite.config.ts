import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Repo name is `govtooling2.github.io`, which is a user/organization site,
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
