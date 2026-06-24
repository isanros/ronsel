import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: "/ronsel/",
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.ico', 'icons/apple-touch-icon.png', 'icons/favicon-16x16.png', 'icons/favicon-32x32.png', 'icons/favicon-48x48.png'],
      manifest: {
        name: 'Ronsel · GPS Tracker',
        short_name: 'Ronsel',
        description: 'Ronsel (estela en gallego): PWA para correr o caminar con GPS, parciales, segmentos, mapa y exportación GPX.',
        theme_color: '#020d1c',
        background_color: '#020d1c',
        display: 'standalone',
        scope: '/ronsel/',
        start_url: '/ronsel/',
        id: '/ronsel/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/maskable-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}']
      }
    })
  ]
});
