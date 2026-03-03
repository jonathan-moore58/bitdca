import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Heavy crypto libs — loaded once, cached forever
          if (id.includes('opnet') || id.includes('@btc-vision')) {
            return 'opnet-sdk';
          }
          // WalletConnect has its own opnet copy
          if (id.includes('@walletconnect') || id.includes('walletconnect')) {
            return 'walletconnect';
          }
          // React core
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler')) {
            return 'react-vendor';
          }
          // Animation / charting — only needed by page components
          if (id.includes('framer-motion') || id.includes('recharts') || id.includes('d3-')) {
            return 'ui-vendor';
          }
          // TanStack Query
          if (id.includes('@tanstack')) {
            return 'query-vendor';
          }
          // Remaining node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
