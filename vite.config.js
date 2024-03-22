import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { comlink } from "vite-plugin-comlink"

export default defineConfig(() => {
  return {
    /* build: {
      outDir: "build",
    }, */
    plugins: [comlink(), react()],
    worker: {
      plugins: () => [comlink()],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
