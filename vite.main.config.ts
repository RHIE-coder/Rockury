import { defineConfig } from 'vite';
import { alias, buildOutputPath } from './vite.common.config';


export default defineConfig({
  resolve: {
    alias,
  },
  build: {
    outDir: buildOutputPath,
    rollupOptions: {
      external: ["better-sqlite3", "mysql2", "pg", "playwright", "appium-ios-device"],
    },

  },
  define: {
    // MAIN_WINDOW_VITE_NAME: '"aaaa"', //ReferenceError: ... is not defined 조심
  },
})
