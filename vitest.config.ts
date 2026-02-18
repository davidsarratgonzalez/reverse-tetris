import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@ai': path.resolve(__dirname, 'src/ai'),
      '@web': path.resolve(__dirname, 'web/src'),
    },
  },
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
  },
});
