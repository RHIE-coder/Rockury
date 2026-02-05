import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { alias, rendererOutputPath } from './vite.common.config';
import { resolve } from 'path';

const appName = "main-window"

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias,
  },
  optimizeDeps: {
    force: true,
  },
  server: {
    // Avoid HMR reload loops when app writes workspace artifacts
    watch: {
      ignored: ['**/workspace/**'],
    },
  },
  // ssr: {
  //   noExternal: ["playwright", "chromium-bidi"],
  //   external: ["playwright", "chromium-bidi", "bufferutil", "utf-8-validate"]
  // },
  root: resolve(__dirname, 'src/renderer/app', appName),
  build: {
    outDir: resolve(rendererOutputPath, appName),
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/app', appName, 'index.html'),
    },
  },
})
