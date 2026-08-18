import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.STORYBOOK === 'true' ? [] : VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon-32.png',
        'favicon-32.webp',
        'apple-touch-icon.png',
        'brand/momentum-orbit-splash.svg',
        'brand/momentum-orbit-master.svg',
      ],
      manifest: {
        id: '/',
        name: 'Momentum',
        short_name: 'Momentum',
        description: 'Personal nutrition, training, progress, and AI-assisted general wellness coaching',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        prefer_related_applications: false,
        background_color: '#161114',
        theme_color: '#161114',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'momentum-pages',
              precacheFallback: {
                fallbackURL: '/index.html',
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
        ],
        globPatterns: [
          '**/*.{js,css,html,woff2,svg,webp}',
          'favicon-32.png',
          'apple-touch-icon.png',
          'pwa-192.png',
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    })),
  ],
  test: {
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
