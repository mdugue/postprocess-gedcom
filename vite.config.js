import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { comlink } from "vite-plugin-comlink"

const ReactCompilerConfig = {
  /* ... */
}

export default defineConfig(() => {
  return {
    /* build: {
      outDir: "build",
    }, */
    plugins: [
      "babel-plugin-react-compiler",
      ReactCompilerConfig,
      comlink(),
      react(),
    ],
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
