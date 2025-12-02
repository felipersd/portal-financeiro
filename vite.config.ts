import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  // Prioritize process.env (Docker) over .env file (Localhost)
  const apiUrl = process.env.VITE_API_URL || env.VITE_API_URL || 'http://api:3000';

  return {
    plugins: [react()],
    server: {
      allowedHosts: true,
      host: true,
      strictPort: false,
      watch: {
        ignored: ['**/.DS_Store', '**/.git/**'],
      },
      hmr: {
        clientPort: 443,
      },
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
