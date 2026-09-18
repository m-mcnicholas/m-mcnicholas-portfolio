import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative production URLs allow the built site to live at a domain root or
  // under a static-hosting project path (GitHub Pages) without code changes.
  base: "./",
  build: {
    rollupOptions: {
      input: {
        portfolio: resolve(import.meta.dirname, "index.html"),
        generativeTree: resolve(import.meta.dirname, "projects/generative-tree/index.html"),
        booleanLogic: resolve(import.meta.dirname, "projects/boolean-logic/index.html")
      }
    }
  }
});
