import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://liftoff-email-craft-git-feat-ai-agent-infra-digi-storms-prod.vercel.app',
        changeOrigin: true,
      },
    },
  },
})
