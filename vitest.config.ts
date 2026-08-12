import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.spec.ts",
    ],
    exclude: [
      "tests/**/*.browser.spec.ts",
      "tests/indexeddb-runtime.spec.js",
    ],
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
});
