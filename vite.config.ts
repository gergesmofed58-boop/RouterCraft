import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/RouterCraft/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/RouterCraft/',
        name: 'RouterCraft — راوتر كرافت',
        short_name: 'RouterCraft',
        description: 'لوحة تحكم أندرويد متكاملة لإدارة شبكة الواي فاي والراوتر، تقسيم السرعة والجيجات، الرقابة الأبوية، وحظر المتطفلين.',
        theme_color: '#0f766e',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        dir: 'rtl',
        lang: 'ar',
        scope: '/RouterCraft/',
        start_url: '/RouterCraft/',
        categories: ['utilities', 'productivity'],
        icons: [
          {
            src: '/RouterCraft/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/RouterCraft/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/RouterCraft/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
            },
          },
        ],
      },
    }),
  ],
})
