import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        host: resolve(import.meta.dirname, "host.html"),
      },
    },
  },
});
