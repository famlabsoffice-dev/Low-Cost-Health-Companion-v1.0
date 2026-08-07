import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: [
      "./tests/setup/fake-indexeddb.ts",
    ],
    exclude: [
      "node_modules/**",
      "tests/indexeddb-runtime.spec.js",
    ],
  },
});
