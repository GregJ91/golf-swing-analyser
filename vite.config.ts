import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://gregj91.github.io/golf-swing-analyser/
  base: '/golf-swing-analyser/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Golf Swing Analyser',
        short_name: 'SwingAnalyser',
        start_url: '/golf-swing-analyser/',
        scope: '/golf-swing-analyser/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1b5e20',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // The MediaPipe WASM fileset and pose model are fetched cross-origin at runtime
        // (see src/pose/PoseProcessor.ts) and are not covered by the default same-origin
        // precache. Without caching these, the app cannot actually run offline after first
        // load, since pose detection can never initialize. Both URLs are pinned to an exact,
        // immutable version, so CacheFirst with no expiration-based eviction is safe.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@0\.10\.14\/wasm\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-wasm',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-model',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})
