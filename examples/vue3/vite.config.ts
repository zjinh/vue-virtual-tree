import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: process.env.DEMO_BASE || (command === 'serve' ? '/' : '/vue-virtual-tree/vue3/'),
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
}))
