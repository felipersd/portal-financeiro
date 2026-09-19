import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  // The proxy calls the gateway, which expects the /api prefix intact.
  // Inside Docker, localhost refers to this frontend container.
  const apiUrl = process.env.VITE_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      allowedHosts: true,
      host: true,
      strictPort: false,
      watch: {
        ignored: ['**/.DS_Store', '**/.git/**'],
      },

      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: false,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      include: ['src/**/*.spec.tsx', 'src/**/*.spec.ts']
    }
  }
})
