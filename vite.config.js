import { defineConfig } from "vite";

// O site é publicado em https://thinkmadu.github.io/Portfolio/, daí o `base`.
export default defineConfig({
  base: "/Portfolio/",
  build: {
    outDir: "dist",
    assetsInlineLimit: 0, // fonte e favicon como arquivo, para o preload e o cache funcionarem
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
