import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: process.env.DEMO_BASE || (command === 'serve' ? '/' : '/vue-virtual-tree/vue2/'),
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
}))
