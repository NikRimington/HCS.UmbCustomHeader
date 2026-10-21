import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['src/nav/nav-model.ts'],
      thresholds: { branches: 100, lines: 100, functions: 100, statements: 100 },
    },
  },
});
