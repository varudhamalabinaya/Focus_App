import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, 'index.html'),
        blocked: resolve(import.meta.dirname, 'blocked.html'),
        background: resolve(import.meta.dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunk) => chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
})
