import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [react()],
  // Tauri expects a fixed port and handles its own console output
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: resolve(__dirname, 'out/renderer'),
    emptyOutDir: true,
    // WebView2 is Chromium-based
    target: 'chrome105'
  }
})
