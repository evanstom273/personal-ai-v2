import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/personalai': {
        target: 'http://127.0.0.1:3847',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3847',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
      },
    },
  },
})

