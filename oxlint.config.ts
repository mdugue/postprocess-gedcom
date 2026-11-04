import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import antiSlop from "ultracite/oxlint/anti-slop";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";

const jsPlugins = selectJsPlugins(["sonarjs", "react-doctor"]);

export default defineConfig({
  env: core.env,
  extends: [core, react, shadcn, antiSlop, jsPlugins],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: [...jsPlugins.jsPlugins, ...shadcn.jsPlugins],
  options: { typeAware: true },
  settings: jsPluginSettings,
});
