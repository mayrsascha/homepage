import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    // Vite 8: Oxc minifier is the default (esbuild removed), single-chunk output
    cssMinify: 'lightningcss',
    modulePreload: {
      polyfill: false,
    },
  },
  server: {
    port: 3000,
  },
})