import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // React Fast Refresh 최적화
      fastRefresh: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Production optimizations
    target: 'esnext',
    minify: 'terser',
    sourcemap: mode === 'development',
    // CSS 코드 분할
    cssCodeSplit: true,
    // 에셋 인라인 임계값
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('zustand') || id.includes('date-fns')) {
              return 'vendor-utils';
            }
            if (id.includes('lodash') || id.includes('moment')) {
              return 'vendor-lodash';
            }
            return 'vendor';
          }
          
          // 애플리케이션 코드 분할
          if (id.includes('src/pages/')) {
            const pageName = id.split('src/pages/')[1].split('/')[0];
            return `page-${pageName}`;
          }
          
          if (id.includes('src/components/')) {
            return 'components';
          }
          
          if (id.includes('src/services/')) {
            return 'services';
          }
        },
        // Chunk naming for better caching
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop()
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return `images/[name]-[hash][extname]`
          }
          if (/woff2?|eot|ttf|otf/i.test(extType || '')) {
            return `fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  // Server configuration for development
  server: {
    port: 5173,
    host: true,
    // HMR 최적화
    hmr: {
      overlay: true,
    },
    // 개발 시 미리 번들링
    fs: {
      allow: ['..']
    }
  },
  // Preview configuration
  preview: {
    port: 4173,
    host: true,
  },
}))
