import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.1.4', // Listen on all IPv4 addresses
    port: 5173,
    strictPort: true,
    hmr: {
      host: '192.168.1.4',
      clientPort: 80,
      protocol: 'ws'
    }
  }
})
