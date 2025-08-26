import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  minify: true,
  clean: true,
  treeshake: true,
  env: { NODE_ENV: "production" },
  outDir: "dist",
  target: "es2022"
});