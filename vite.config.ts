import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon-32.png',
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
        background_color: '#090d1a',
        theme_color: '#090d1a',
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
        navigateFallback: '/index.html',
        globPatterns: [
          '**/*.{js,css,html,woff2,svg}',
          'favicon-32.png',
          'apple-touch-icon.png',
          'pwa-192.png',
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  test: {
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
