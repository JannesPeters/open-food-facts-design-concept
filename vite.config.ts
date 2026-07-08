import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Open Food Facts — Redesign Concept',
        short_name: 'Open Food Facts',
        description:
          'Search, browse, and scan food products to see ingredients, nutrition, and Nutri-Score, NOVA, and Eco-Score at a glance.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/api\/v2\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openfoodfacts-api',
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openfoodfacts-images',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/__openfoodfacts': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        secure: true,
        headers: {
          // Browsers can't set User-Agent, but the dev proxy runs in Node and can.
          // OFF asks reusers to identify themselves with a descriptive UA.
          'User-Agent':
            'OpenFoodFactsDesignConcept/0.0 (local dev; https://github.com/JannesPeters/open-food-facts-design-concept)',
        },
        rewrite: (path) => path.replace(/^\/__openfoodfacts/, '/api/v2'),
      },
      // Full-text search uses the legacy CGI endpoint (/cgi/search.pl), which
      // is not under /api/v2, so it needs its own proxy route.
      '/__off-cgi': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        secure: true,
        headers: {
          'User-Agent':
            'OpenFoodFactsDesignConcept/0.0 (local dev; https://github.com/JannesPeters/open-food-facts-design-concept)',
        },
        rewrite: (path) => path.replace(/^\/__off-cgi/, '/cgi'),
      },
    },
  },
})
