import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      '@core': resolve(__dirname, '../src/core'),
      '@ai': resolve(__dirname, '../src/ai'),
      '@web': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../dist-web'),
    emptyOutDir: true,
  },
});
