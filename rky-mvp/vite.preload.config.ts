import { defineConfig } from 'vite';
import { alias, buildOutputPath } from './vite.common.config';

export default defineConfig({
  resolve: {
    alias,
  },
  build: {
    outDir: buildOutputPath,
  },
})