import { defineConfig } from "vite";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const engineAssets = ["engine.wasm.gz", "engine-words.jsonl.gz"];
let resolvedConfig;

export default defineConfig({
  plugins: [{
    name: "optional-tracking-assets",
    apply: "build",
    configResolved(config) { resolvedConfig = config; },
    async closeBundle() {
      const { root, build } = resolvedConfig;
      if (existsSync(resolve(root, "src/production/engine"))) return;
      await Promise.all(engineAssets.map(file => rm(resolve(root, build.outDir, "data", file), { force: true })));
    },
  }],
  server: {
    proxy: { "/api": "http://127.0.0.1:8000" },
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/private-audio/**"] },
  },
  build: { outDir: "build", target: "es2022" },
});
