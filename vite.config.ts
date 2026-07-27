import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Golf Swing Analyser',
        short_name: 'SwingAnalyser',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1b5e20',
        icons: [],
      },
    }),
  ],
})
