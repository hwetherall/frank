import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@frank/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
    }
  }
})
