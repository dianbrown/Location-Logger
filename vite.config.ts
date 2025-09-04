import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/script\.google\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-scripts-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-apis-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            urlPattern: /\.(?:js|mjs|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              cacheableResponse: {
                statuses: [200]
              }
            }
          }
        ]
      },
      manifest: false, // We'll keep using our custom manifest.json
      devOptions: {
        enabled: false
      }
    })
  ],
  base: '/Location-Logger/', // GitHub Pages base path
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Ensure JS files have proper extensions
        entryFileNames: 'assets/[name]-[hash].mjs',
        chunkFileNames: 'assets/[name]-[hash].mjs',
        assetFileNames: (assetInfo) => {
          // Ensure manifest.json goes to root
          if (assetInfo.name === 'manifest.json') {
            return '[name].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    }
  },
  publicDir: 'public'
})
