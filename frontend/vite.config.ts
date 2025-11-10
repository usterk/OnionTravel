import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 7000,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
