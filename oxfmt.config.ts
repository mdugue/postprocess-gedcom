import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // Agent instructions, skills and generated shadcn components are vendored.
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "AGENTS.md",
    ".agents/**",
    ".claude/**",
    "src/components/ui/**",
  ],
});
