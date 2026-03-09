import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
      '@': resolve(__dirname, 'src/renderer'),
      '#': resolve(__dirname, 'src/main'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/main/**', 'src/renderer/**', 'src/shared/**'],
      exclude: ['**/*.d.ts', '**/index.ts'],
    },
  },
});
