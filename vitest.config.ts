import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup-tests.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    includeSource: ['tests/integration/**/*.test.ts'],
    environmentMatchGlobs: [
      ['**/*.dom.test.tsx', 'jsdom'],
      ['**/*.ui.test.tsx', 'jsdom'],
    ],
  },
});
