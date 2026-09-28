import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root: rootDir,
  publicDir: path.join(rootDir, 'public'),
  plugins: [react()],
  build: {
    outDir: path.resolve(rootDir, '../dist'),
  },
  server: {
    host: true,   // listen on 0.0.0.0 so LAN devices can connect via IP
    port: 5173,
    proxy: {
      // All /api requests are forwarded from Vite (5173) → Express (3001)
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})