import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    minify: true,
    clean: true,
    treeshake: true,
    env: { NODE_ENV: "production" },
    outDir: "dist",
    target: "es2022",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    minify: false,
    clean: false,
    treeshake: false,
    env: { NODE_ENV: "production" },
    outDir: "dist",
    target: "es2022",
    outExtension() {
      return { js: ".js" };
    },
  },
]);