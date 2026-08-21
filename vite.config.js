import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative production URLs allow the built site to live at a domain root or
  // under a static-hosting project path without changing application code.
  base: "./",
  build: {
    rollupOptions: {
      input: {
        portfolio: resolve(import.meta.dirname, "index.html"),
        generativeTree: resolve(import.meta.dirname, "projects/generative-tree/index.html")
      }
    }
  }
});
