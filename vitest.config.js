import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup/indexeddb.setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: [
      'tests/**/*.spec.js',
      '**/node_modules/**',
      '**/indexeddb-runtime.spec.js',
      '**/*.pw.spec.{js,ts}'
    ]
  }
});
