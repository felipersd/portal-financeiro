import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    host: true,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://api:3000',
        changeOrigin: false, // Keep original host header (localhost:5173)
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
