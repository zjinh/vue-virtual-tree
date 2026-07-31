import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.DEMO_BASE || '/',
  define: {
    __DEMO_RUNTIME__: JSON.stringify('Vue 3'),
  },
  plugins: [vue()],
  resolve: {
    dedupe: ['vue'],
  },
  server: {
    port: 4173,
  },
})
