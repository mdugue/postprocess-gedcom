import { rm } from "node:fs/promises";

import tailwind from "bun-plugin-tailwind";

const OUT_DIR = "dist";

await rm(OUT_DIR, { force: true, recursive: true });

const result = await Bun.build({
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  entrypoints: ["src/index.html"],
  minify: true,
  outdir: OUT_DIR,
  plugins: [tailwind],
  sourcemap: "linked",
  target: "browser",
});

if (!result.success) {
  throw new AggregateError(result.logs, "Build failed");
}
