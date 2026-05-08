import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    css: true,
    include: ['src/__tests__/**/*.test.{js,jsx}'],
    exclude: ['../../Cigar/__tests__/**', '../../Cigar_server/**'],
    // 确保 jsdom 提供完整的 browser-like 环境
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
  },
})
