import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces
    port: parseInt(process.env.PORT || '5173'),
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: parseInt(process.env.PORT || '5173'),
      protocol: 'ws'
    },
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: parseInt(process.env.PORT || '4173'),
    host: true,
    strictPort: true
  }
})
