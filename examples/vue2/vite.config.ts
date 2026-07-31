import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.DEMO_BASE || '/',
  define: {
    __DEMO_RUNTIME__: JSON.stringify('Vue 2.7'),
  },
  plugins: [vue2()],
  resolve: {
    dedupe: ['vue'],
  },
  server: {
    port: 4172,
  },
})
