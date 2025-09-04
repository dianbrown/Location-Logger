import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Location-Logger/', // GitHub Pages base path
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      // Remove the sw.js from input - it should be copied as a static asset
    }
  },
  publicDir: 'public'
})
